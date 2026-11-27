export const success = (res, data, message = 'Sucesso', status = 200) =>
  res.status(status).json({ success: true, message, data });

export const error = (res, message, status = 400) =>
  res.status(status).json({ success: false, error: message });