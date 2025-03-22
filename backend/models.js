import mongoose from "mongoose";

// Dataset Schema
const datasetSchema = new mongoose.Schema({
  question: { 
    type: String, 
    required: [true, 'Question is required'] 
  },
  possible_answers: { 
    type: [String], 
    required: [true, 'Possible answers are required'],
    validate: {
      validator: function(v) {
        return v.length >= 2;
      },
      message: 'At least two possible answers required'
    }
  },
  reference_answer: { 
    type: String, 
    required: [true, 'Reference answer is required'] 
  },
  category: { 
    type: String, 
    required: [true, 'Category is required'] 
  },
  difficulty: { 
    type: Number, 
    required: [true, 'Difficulty is required'],
    min: [0, 'Difficulty cannot be below 0'],
    max: [2, 'Difficulty cannot exceed 2']
  }
});

// Response Schema with safety defaults
const responseSchema = new mongoose.Schema({
  question: { 
    type: String, 
    required: [true, 'Question is required'] 
  },
  model1: { 
    type: String, 
    required: true,
    default: 'DeepSeek-R1-Zero'
  },
  response1: { 
    type: String, 
    required: true,
    default: 'No response'
  },
  correctness1: { 
    type: Number, 
    required: true,
    default: 0,
    min: 0,
    max: 10
  },
  faithfulness1: { 
    type: Number, 
    required: true,
    default: 0,
    min: 0,
    max: 10
  },
  model2: { 
    type: String, 
    required: true,
    default: 'Qwen-32B'
  },
  response2: { 
    type: String, 
    required: true,
    default: 'No response'
  },
  correctness2: { 
    type: Number, 
    required: true,
    default: 0,
    min: 0,
    max: 10
  },
  faithfulness2: { 
    type: Number, 
    required: true,
    default: 0,
    min: 0,
    max: 10
  },
  category: { 
    type: String, 
    required: true 
  },
  difficulty: { 
    type: Number, 
    required: true 
  },
  reference_answer: { 
    type: String, 
    required: true 
  }
}, {
  timestamps: true,
  validateBeforeSave: false // Bypass validation for error tolerance
});

// Indexes
responseSchema.index({ category: 1, difficulty: 1 });
responseSchema.index({ createdAt: -1 });
responseSchema.index({ 'model1': 1, 'model2': 1 });


export const Dataset = mongoose.model('Dataset', datasetSchema);
export const Response = mongoose.model('Response', responseSchema);