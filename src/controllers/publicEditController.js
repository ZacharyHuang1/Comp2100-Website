const publicEditService = require('../services/publicEditService');
const env = require('../config/env');

async function getEditingStatus(_req, res) {
  return res.json({ enabled: env.publicDocumentEditing });
}

async function updateContent(req, res, next) {
  try {
    return res.json(await publicEditService.updateContent(req.params.id, req.body));
  } catch (error) {
    return next(error);
  }
}

async function createBlock(req, res, next) {
  try {
    return res.status(201).json(
      await publicEditService.createBlock(req.params.id, req.body)
    );
  } catch (error) {
    return next(error);
  }
}

async function updateVariant(req, res, next) {
  try {
    return res.json(await publicEditService.updateVariant(req.params.id, req.body));
  } catch (error) {
    return next(error);
  }
}

async function deleteVariant(req, res, next) {
  try {
    return res.json(await publicEditService.deleteVariant(req.params.id));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createBlock,
  deleteVariant,
  getEditingStatus,
  updateContent,
  updateVariant,
};
