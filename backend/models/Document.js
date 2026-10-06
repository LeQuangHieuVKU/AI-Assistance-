import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  extractedText: {
    type: String,
    default: "",
  },
  chunnks: [
    {
      content: {
        type: String,
        required: true,
      },
      pageNumber: {
        type: Number,
        default: 0,
      },
      chunkIndex: {
        type: Number,
        required: true,
      },
    },
  ],
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  lastAccessed: {
    type: Date,
    default: Date.now,
  },status: {
    type: String,
    enum: ["processing", "ready", "error"],
    default: "processing",
  }
},{ timestamps: true,});

// Index for faster queries on userId and title
documentSchema.index({ userId: 1, updateDate: -1 });

const Document = mongoose.model("Document", documentSchema);

export default Document;