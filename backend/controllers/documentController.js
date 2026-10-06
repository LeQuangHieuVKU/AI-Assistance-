import Document from "../models/Document.js";
import Flashcard from "../models/Flashcard.js";
import Quiz from "../models/Quiz.js";
import { extractTextFromPDF } from "../utils/pdfParser.js";
import { chuckText } from "../utils/textChunker.js";
import fs from "fs/promises";
import mongoose from "mongoose";

//@desc Upload a new document
//@route POST /api/documents/upload
//@access Private

export const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a PDF file",
        status: 400,
      });
    }

    const { title } = req.body;

    if (!title) {
      // Delete uploaded file if no title is provided
      await fs.unlink(req.file.path);
      return res.status(400).json({
        success: false,
        message: "Please provide a title for the document",
        status: 400,
      });
    }

    //Construct the URL for the uploaded file
    const baseUrl = `https://localhost:${process.env.PORT || 8000}`;
    const fileUrl = `${baseUrl}/uploads/documents/${req.file.filename}`;

    // Create document record
    const document = await Document.create({
      userId: req.user._id,
      title,
      fileName: req.file.filename,
      fileUrl: fileUrl,
      fileSize: req.file.size,
      status: "processing",
    });

    //Process PDF in background (in production, use a queue like Bull)
    processPDF(document._id, req.file.path).catch((err) => {
      console.error("Error processing PDF:", err);
    });

    res.status(201).json({
      success: true,
      message: "Document uploaded successfully. Processing in background....",
      data: document,
    });
  } catch (error) {
    //Clean up file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch((err) => {});
    }
    next(error);
  }
};

//Helper fuction to process PDF, extract text, chunk it, and create flashcards and quizzes
const processPDF = async (documentId, filePath) => {
  try {
    const { text } = await extractTextFromPDF(filePath);
    const chunks = chuckText(text, 500, 50); //Chunk text into 500 character pieces

    await Document.findByIdAndUpdate(documentId, {
      status: "ready",
      extractedText: text,
      chunks: chunks,
    });
  } catch (error) {
    console.error(`Error processing PDF ${documentId}: `, error);
    await Document.findByIdAndUpdate(documentId, { status: "failed" });
  }
};

//@desc Get all user documents
//@route GET /api/documents
//access Private
export const getDocuments = async (req, res, next) => {
  try {
    const documents = await Document.aggregate([
      {
        $match: { userId: new mongoose.Types.ObjectId(req.user._id) },
      },
      {
        $lookup: {
          from: "flashcards",
          localField: "_id",
          foreignField: "documentId",
          as: "flashcardSets",
        },
      },
      {
        $lookup: {
          from: "quizzes",
          localField: "_id",
          foreignField: "documentId",
          as: "quizzes",
        },
      },
      {
        $addFields: {
          flashcardCount: { $size: "$flashcardSets" },
          quizCount: { $size: "$quizzes" },
        },
      },
      {
        $project: {
          extractedText: 0, // Exclude extracted text from the response
          chunks: 0, // Exclude chunks from the response
          flashcardSets: 0, // Exclude flashcard sets from the response
          quizzes: 0, // Exclude quizzes from the response
        },
      },
      {
        $sort: { uploadDate: -1 },
      },
    ]);

    res.status(200).json({
      success: true,
      count: documents.length,
      data: documents,
    });
  } catch (error) {
    next(error);
  }
};

//@desc Get a single document by ID
//@route GET /api/documents/:id
//access Private
export const getDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not found",
        status: 404,
      });
    }

    //Get counts of associated flashcards and quizzes
    const flashcardCount = await Flashcard.countDocuments({
      documentId: document._id,
      userId: req.user._id,
    });
    const quizCount = await Quiz.countDocuments({
      documentId: document._id,
      userId: req.user._id,
    });

    //Update last accessed
    document.lastAccessed = new Date();
    await document.save();

    //Combine document data with counts
    const documentData = document.toObject();
    documentData.flashcardCount = flashcardCount;
    documentData.quizCount = quizCount;

    res.status(200).json({
      success: true,
      data: documentData,
    });
  } catch (error) {
    next(error);
  }
};

//@desc Delete a document by ID
//@route DELETE /api/documents/:id
//access Private
export const deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not found",
        status: 404,
      });
    }

    //Delete file from server
    await fs.unlink(document.filePath).catch((e) => {});

    //Delete document
    await document.deleteOne();

    res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {}
};

