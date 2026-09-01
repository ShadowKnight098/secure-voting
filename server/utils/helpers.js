export const successResponse = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

export const errorResponse = (res, message = 'Error', statusCode = 500, error = null) => {
  const response = {
    success: false,
    message
  };
  
  if (error && (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV)) {
      response.error = error.message || error;
  }
  
  return res.status(statusCode).json(response);
};

export const getPagination = (query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

export const getSearchFilter = (query, fields) => {
  const search = query.search || '';
  if (!search) return { sql: '', params: [] };

  const conditions = fields.map(field => `${field} LIKE ?`);
  const sql = `(${conditions.join(' OR ')})`;
  const params = fields.map(() => `%${search}%`);

  return { sql, params };
};
