import Service from "../models/Service";

export const getServicesService = async (
  page: number = 1,
  limit: number = 10,
  category: string | undefined = undefined,
  search: string | undefined = undefined
) => {
  const query: any = {};

  if (category) {
    query.category = category;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } }
    ];
  }

  const services = await Service.find(query)
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Service.countDocuments(query);

  return {
    data: services,
    total,
    page,
    limit,
    hasMore: page * limit < total
  };
};

export const getServiceByIdService = async (id: string) => {
  const service = await Service.findById(id);
  if (!service) {
    throw { statusCode: 404, message: "Service not found" };
  }
  return service;
};

export const createServiceService = async (serviceData: any) => {
  const service = await Service.create(serviceData);
  return service;
};
