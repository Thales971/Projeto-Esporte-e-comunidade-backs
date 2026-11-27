export const paginate = (page = 1, limit = 10) => ({
  skip: (page - 1) * limit,
  take: limit,
});

export const paginatedResponse = (data, total, page, limit) => ({
  data,
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
});