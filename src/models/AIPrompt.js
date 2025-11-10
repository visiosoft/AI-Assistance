import mongoose from 'mongoose';

const aiPromptSchema = new mongoose.Schema({
    prompt: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Get prompt from database (returns null if doesn't exist)
aiPromptSchema.statics.getPrompt = async function() {
    return await this.findOne();
};

// Update or create prompt (only creates if doesn't exist, using the provided prompt)
aiPromptSchema.statics.updatePrompt = async function(newPrompt) {
    let prompt = await this.findOne();
    if (!prompt) {
        // Only create if it doesn't exist, using the provided prompt (not hardcoded)
        prompt = await this.create({ prompt: newPrompt });
    } else {
        prompt.prompt = newPrompt;
        await prompt.save();
    }
    return prompt;
};

const AIPrompt = mongoose.models.AIPrompt || mongoose.model('AIPrompt', aiPromptSchema);

export default AIPrompt;

