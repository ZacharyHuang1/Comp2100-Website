const adminAuthService = require('../services/adminAuthService');
const authService = require('../services/authService');
const adminService = require('../services/adminService');
const userService = require('../services/userService');

async function login(req, res) {
  const username = typeof req.body.username === 'string' ? req.body.username : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!adminAuthService.authenticateCredentials(username, password)) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  adminAuthService.setSessionCookie(res);
  const rootUser = await authService.ensureRootPassword();
  await authService.createSessionForUser({
    user: { id: Number(rootUser.id) },
    rememberDevice: false,
    req,
    res,
  });

  return res.json({ authenticated: true });
}

async function logout(req, res) {
  await authService.logout(req, res);
  adminAuthService.clearSessionCookie(res);
  return res.json({ authenticated: false });
}

async function me(req, res) {
  if (
    req.currentUser &&
    (req.currentUser.role === 'manager' || req.currentUser.role === 'root_manager')
  ) {
    return res.json({ authenticated: true, user: req.currentUser });
  }

  const authenticated = adminAuthService.isAuthenticated(req);

  if (!authenticated) {
    return res.json({ authenticated: false });
  }

  const user = await userService.getRootUser();

  return res.json({
    authenticated: true,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      status: user.status,
    },
  });
}

async function getCategories(_req, res, next) {
  try {
    return res.json(await adminService.listCategories());
  } catch (error) {
    return next(error);
  }
}

async function createCategory(req, res, next) {
  try {
    return res.status(201).json(await adminService.createCategory(req.body));
  } catch (error) {
    return next(error);
  }
}

async function updateCategory(req, res, next) {
  try {
    return res.json(
      await adminService.updateCategory(req.params.id, req.body)
    );
  } catch (error) {
    return next(error);
  }
}

async function deleteCategory(req, res, next) {
  try {
    return res.json(await adminService.deleteCategory(req.params.id));
  } catch (error) {
    return next(error);
  }
}

async function getTopics(_req, res, next) {
  try {
    return res.json(await adminService.listTopics());
  } catch (error) {
    return next(error);
  }
}

async function createTopic(req, res, next) {
  try {
    return res.status(201).json(await adminService.createTopic(req.body));
  } catch (error) {
    return next(error);
  }
}

async function updateTopic(req, res, next) {
  try {
    return res.json(await adminService.updateTopic(req.params.id, req.body));
  } catch (error) {
    return next(error);
  }
}

async function deleteTopic(req, res, next) {
  try {
    return res.json(
      await adminService.deleteTopic(req.params.id, {
        cascade: req.query.cascade === 'true',
      })
    );
  } catch (error) {
    return next(error);
  }
}

async function getContents(_req, res, next) {
  try {
    return res.json(await adminService.listContents());
  } catch (error) {
    return next(error);
  }
}

async function getContent(req, res, next) {
  try {
    return res.json(await adminService.getContent(req.params.id));
  } catch (error) {
    return next(error);
  }
}

async function createContent(req, res, next) {
  try {
    return res.status(201).json(await adminService.createContent(req.body));
  } catch (error) {
    return next(error);
  }
}

async function updateContent(req, res, next) {
  try {
    return res.json(await adminService.updateContent(req.params.id, req.body));
  } catch (error) {
    return next(error);
  }
}

async function deleteContent(req, res, next) {
  try {
    return res.json(await adminService.deleteContent(req.params.id));
  } catch (error) {
    return next(error);
  }
}

async function getTopicVariants(req, res, next) {
  try {
    return res.json(await adminService.getTopicVariants(req.params.id));
  } catch (error) {
    return next(error);
  }
}

async function updateVariant(req, res, next) {
  try {
    return res.json(await adminService.updateVariant(req.params.id, req.body));
  } catch (error) {
    return next(error);
  }
}

async function deleteVariant(req, res, next) {
  try {
    return res.json(await adminService.deleteVariant(req.params.id));
  } catch (error) {
    return next(error);
  }
}

async function uploadJava(req, res, next) {
  try {
    return res.status(201).json(
      await adminService.uploadJavaFile({
        categoryId: req.body.categoryId,
        file: req.file,
      })
    );
  } catch (error) {
    return next(error);
  }
}

async function importCodebase(req, res, next) {
  try {
    return res.json(await adminService.importCodebase(req.body));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createCategory,
  createContent,
  createTopic,
  deleteCategory,
  deleteContent,
  deleteTopic,
  deleteVariant,
  getCategories,
  getContent,
  getContents,
  getTopicVariants,
  importCodebase,
  getTopics,
  login,
  logout,
  me,
  updateCategory,
  updateContent,
  updateTopic,
  updateVariant,
  uploadJava,
};
