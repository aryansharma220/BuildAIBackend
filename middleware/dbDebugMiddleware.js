/**
 * Middleware to debug MongoDB operations
 */
const mongoose = require('mongoose');

const setupMongoDBDebugging = () => {
  if (process.env.MONGODB_DEBUG === 'true') {
    mongoose.set('debug', true);
    
    // Log all MongoDB queries
    const originalExec = mongoose.Query.prototype.exec;
    
    mongoose.Query.prototype.exec = async function(...args) {
      console.log(`MongoDB Query: ${this.getQuery()}`);
      console.log(`MongoDB Collection: ${this.model.collection.name}`);
      console.log(`MongoDB Operation: ${this.op}`);
      
      try {
        const result = await originalExec.apply(this, args);
        console.log(`MongoDB Result: ${result ? (Array.isArray(result) ? `Array[${result.length}]` : 'Document') : 'null'}`);
        return result;
      } catch (error) {
        console.error(`MongoDB Error: ${error.message}`);
        throw error;
      }
    };
    
    console.log('MongoDB debugging enabled');
  }
};

module.exports = setupMongoDBDebugging;
