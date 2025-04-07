const express = require('express');
const router = express.Router();
const Digest = require('../models/digestModel');
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/userModel');

/**
 * GET /api/digests
 * Fetch digests with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    const {
      category,
      source,
      page = 1,
      limit = 10,
      startDate,
      endDate,
      tags,
      search
    } = req.query;

    // Build query
    const query = {};
    
    if (category) query.category = category;
    if (source) query.source = source;
    
    // Handle tags - can be string or array
    if (tags) {
      const tagList = Array.isArray(tags) ? tags : tags.split(',');
      query.tags = { $in: tagList };
    }
    
    // Handle date range
    if (startDate || endDate) {
      query.date_created = {};
      if (startDate) query.date_created.$gte = new Date(startDate);
      if (endDate) query.date_created.$lte = new Date(endDate);
    }
    
    // Handle text search
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query
    const digests = await Digest.find(query)
      .sort({ date_created: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Digest.countDocuments(query);

    res.status(200).json({
      digests,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching digests:', error);
    res.status(500).json({ message: 'Error fetching digests', error: error.message });
  }
});

/**
 * GET /api/digests/personalized
 * Fetch digests based on user preferences
 * Requires authentication
 */
router.get('/personalized', authMiddleware, async (req, res) => {
  try {
    // Get user preferences
    const user = await User.findOne({ uid: req.user.uid });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const {
      page = 1,
      limit = 10
    } = req.query;
    
    const query = {};
    
    // Apply user category preferences if they exist
    if (user.preferences?.categories && user.preferences.categories.length > 0) {
      query.category = { $in: user.preferences.categories };
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query
    const digests = await Digest.find(query)
      .sort({ date_created: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await Digest.countDocuments(query);
    
    res.status(200).json({
      digests,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching personalized digests:', error);
    res.status(500).json({ message: 'Error fetching personalized digests', error: error.message });
  }
});

/**
 * GET /api/digests/:id
 * Fetch a single digest by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const digest = await Digest.findById(req.params.id);
    
    if (!digest) {
      return res.status(404).json({ message: 'Digest not found' });
    }
    
    res.status(200).json(digest);
  } catch (error) {
    console.error('Error fetching digest:', error);
    res.status(500).json({ message: 'Error fetching digest', error: error.message });
  }
});

/**
 * GET /api/digests/categories/list
 * Get list of all categories with counts
 */
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await Digest.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    res.status(200).json(categories.map(cat => ({
      category: cat._id,
      count: cat.count
    })));
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
});

/**
 * GET /api/digests/sources/list
 * Get list of all sources with counts
 */
router.get('/sources/list', async (req, res) => {
  try {
    const sources = await Digest.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    res.status(200).json(sources.map(src => ({
      source: src._id,
      count: src.count
    })));
  } catch (error) {
    console.error('Error fetching sources:', error);
    res.status(500).json({ message: 'Error fetching sources', error: error.message });
  }
});

/**
 * GET /api/digests/tags/list
 * Get list of all tags with counts
 */
router.get('/tags/list', async (req, res) => {
  try {
    const tags = await Digest.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    res.status(200).json(tags.map(tag => ({
      tag: tag._id,
      count: tag.count
    })));
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ message: 'Error fetching tags', error: error.message });
  }
});

/**
 * GET /api/digests/stats
 * Get digest statistics (counts by category, source, time period)
 */
router.get('/stats', async (req, res) => {
  try {
    // Get overall counts
    const totalDigests = await Digest.countDocuments();
    
    // Get counts by category
    const categoryCounts = await Digest.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get counts by source
    const sourceCounts = await Digest.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get counts by time period (last 24 hours, last week)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const lastDayCount = await Digest.countDocuments({ date_created: { $gte: oneDayAgo } });
    const lastWeekCount = await Digest.countDocuments({ date_created: { $gte: oneWeekAgo } });
    
    res.status(200).json({
      total: totalDigests,
      byCategory: categoryCounts.map(cat => ({ name: cat._id, count: cat.count })),
      bySource: sourceCounts.map(src => ({ name: src._id, count: src.count })),
      byTimePeriod: {
        lastDay: lastDayCount,
        lastWeek: lastWeekCount
      }
    });
  } catch (error) {
    console.error('Error fetching digest stats:', error);
    res.status(500).json({ message: 'Error fetching digest stats', error: error.message });
  }
});

module.exports = router;
