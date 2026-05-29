const documentationService = require('../services/documentationService');

async function getSpaces(req, res, next) {
  try {
    return res.json(
      await documentationService.getSpaces(
        {
          includeArchived: req.query.archived === 'true',
          ownerUserId: req.query.ownerUserId,
        },
        req.currentUser
      )
    );
  } catch (error) {
    return next(error);
  }
}

async function createSpace(req, res, next) {
  try {
    return res
      .status(201)
      .json(await documentationService.createSpace(req.body, req.currentUser));
  } catch (error) {
    return next(error);
  }
}

async function getSpace(req, res, next) {
  try {
    return res.json(
      await documentationService.getSpace(req.params.id, req.currentUser)
    );
  } catch (error) {
    return next(error);
  }
}

async function updateSpace(req, res, next) {
  try {
    return res.json(
      await documentationService.updateSpace(
        req.params.id,
        req.body,
        req.currentUser
      )
    );
  } catch (error) {
    return next(error);
  }
}

async function deleteSpace(req, res, next) {
  try {
    return res.json(
      await documentationService.deleteSpace(req.params.id, req.currentUser)
    );
  } catch (error) {
    return next(error);
  }
}

async function archiveSpace(req, res, next) {
  try {
    return res.json(
      await documentationService.archiveSpace(req.params.id, req.currentUser)
    );
  } catch (error) {
    return next(error);
  }
}

async function getPages(req, res, next) {
  try {
    return res.json(
      await documentationService.getPages(
        {
          includeArchived: req.query.archived === 'true',
          ownerUserId: req.query.ownerUserId,
          spaceId: req.query.spaceId,
          q: req.query.q,
          instructionType: req.query.instructionType,
        },
        req.currentUser
      )
    );
  } catch (error) {
    return next(error);
  }
}

async function createPage(req, res, next) {
  try {
    return res
      .status(201)
      .json(await documentationService.createPage(req.body, req.currentUser));
  } catch (error) {
    return next(error);
  }
}

async function getPage(req, res, next) {
  try {
    return res.json(
      await documentationService.getPage(req.params.id, req.currentUser)
    );
  } catch (error) {
    return next(error);
  }
}

async function updatePage(req, res, next) {
  try {
    return res.json(
      await documentationService.updatePage(
        req.params.id,
        req.body,
        req.currentUser
      )
    );
  } catch (error) {
    return next(error);
  }
}

async function deletePage(req, res, next) {
  try {
    return res.json(
      await documentationService.deletePage(req.params.id, req.currentUser)
    );
  } catch (error) {
    return next(error);
  }
}

async function archivePage(req, res, next) {
  try {
    return res.json(
      await documentationService.archivePage(req.params.id, req.currentUser)
    );
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  archivePage,
  archiveSpace,
  createPage,
  createSpace,
  deletePage,
  deleteSpace,
  getPage,
  getPages,
  getSpace,
  getSpaces,
  updatePage,
  updateSpace,
};

