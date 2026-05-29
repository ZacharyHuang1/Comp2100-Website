const gitSimulatorService = require('../services/gitSimulatorService');

async function getSession(req, res, next) {
  try {
    res.json(await gitSimulatorService.getState(req.currentUser));
  } catch (error) {
    next(error);
  }
}

async function commit(req, res, next) {
  try {
    res.json(await gitSimulatorService.commit(req.body || {}, req.currentUser));
  } catch (error) {
    next(error);
  }
}

async function push(req, res, next) {
  try {
    res.json(await gitSimulatorService.push(req.body || {}, req.currentUser));
  } catch (error) {
    next(error);
  }
}

async function pull(req, res, next) {
  try {
    res.json(await gitSimulatorService.pull(req.body || {}, req.currentUser));
  } catch (error) {
    next(error);
  }
}

async function createBranch(req, res, next) {
  try {
    res.json(await gitSimulatorService.createBranch(req.body || {}, req.currentUser));
  } catch (error) {
    next(error);
  }
}

async function checkout(req, res, next) {
  try {
    res.json(await gitSimulatorService.checkout(req.body || {}, req.currentUser));
  } catch (error) {
    next(error);
  }
}

async function merge(req, res, next) {
  try {
    res.json(await gitSimulatorService.merge(req.body || {}, req.currentUser));
  } catch (error) {
    next(error);
  }
}

async function reset(req, res, next) {
  try {
    res.json(await gitSimulatorService.reset(req.currentUser));
  } catch (error) {
    next(error);
  }
}

async function clearHistory(req, res, next) {
  try {
    res.json(await gitSimulatorService.clearHistory(req.currentUser));
  } catch (error) {
    next(error);
  }
}

async function undo(req, res, next) {
  try {
    res.json(await gitSimulatorService.undo(req.currentUser));
  } catch (error) {
    next(error);
  }
}

async function getEvents(req, res, next) {
  try {
    res.json(await gitSimulatorService.getEvents(req.currentUser));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  checkout,
  clearHistory,
  commit,
  createBranch,
  getEvents,
  getSession,
  merge,
  pull,
  push,
  reset,
  undo,
};
