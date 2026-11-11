import {
  createProject,
  listProjects,
  getProjectById,
  updateProject,
  deleteProjectCascade
} from '../services/projectService.js';

export async function handleCreateProject(req, res, next) {
  try {
    const project = await createProject(req.user.id, req.body);
    res.status(201).json({
      data: { project }
    });
  } catch (err) {
    next(err);
  }
}

export async function handleListProjects(req, res, next) {
  try {
    const result = await listProjects(req.user.id, req.query);
    res.status(200).json({
      data: result
    });
  } catch (err) {
    next(err);
  }
}

export async function handleGetProject(req, res, next) {
  try {
    const project = await getProjectById(req.user.id, req.params.id);
    res.status(200).json({
      data: { project }
    });
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateProject(req, res, next) {
  try {
    const project = await updateProject(req.user.id, req.params.id, req.body);
    res.status(200).json({
      data: { project }
    });
  } catch (err) {
    next(err);
  }
}

export async function handleDeleteProject(req, res, next) {
  try {
    const result = await deleteProjectCascade(req.user.id, req.params.id, req.query);
    res.status(200).json({
      data: result
    });
  } catch (err) {
    next(err);
  }
}

export async function handleArchiveProject(req, res, next) {
  try {
    const project = await updateProject(req.user.id, req.params.id, { status: 'archived' });
    res.status(200).json({
      data: { project }
    });
  } catch (err) {
    next(err);
  }
}

export async function handleUnarchiveProject(req, res, next) {
  try {
    const project = await updateProject(req.user.id, req.params.id, { status: 'active' });
    res.status(200).json({
      data: { project }
    });
  } catch (err) {
    next(err);
  }
}
