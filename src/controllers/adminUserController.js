const userService = require('../services/userService');

async function getUsers(req, res, next) {
  try {
    res.json(await userService.getUsers(req.query));
  } catch (error) {
    next(error);
  }
}

async function getUser(req, res, next) {
  try {
    res.json(await userService.getUser(req.params.id));
  } catch (error) {
    next(error);
  }
}

async function createUser(req, res, next) {
  try {
    res.status(201).json(await userService.createUser(req.body));
  } catch (error) {
    next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    res.json(await userService.updateUser(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    res.json(await userService.deleteUser(req.params.id));
  } catch (error) {
    next(error);
  }
}

async function grantManager(req, res, next) {
  try {
    res.json(await userService.grantManager(req.params.id));
  } catch (error) {
    next(error);
  }
}

async function revokeManager(req, res, next) {
  try {
    res.json(await userService.revokeManager(req.params.id));
  } catch (error) {
    next(error);
  }
}

async function disableUser(req, res, next) {
  try {
    res.json(await userService.disableUser(req.params.id));
  } catch (error) {
    next(error);
  }
}

async function enableUser(req, res, next) {
  try {
    res.json(await userService.enableUser(req.params.id));
  } catch (error) {
    next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    res.json(
      await userService.resetPassword(
        req.params.id,
        req.body,
        req.currentUser
      )
    );
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createUser,
  deleteUser,
  disableUser,
  enableUser,
  getUser,
  getUsers,
  grantManager,
  resetPassword,
  revokeManager,
  updateUser,
};
