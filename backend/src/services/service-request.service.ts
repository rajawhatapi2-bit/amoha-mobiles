import ServiceRequest, { IServiceRequest } from '../models/service-request.model';
import { NotFoundError } from '../errors/app-error';
import { v4 as uuidv4 } from 'uuid';

class ServiceRequestService {
  private generateRequestNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = uuidv4().slice(0, 6).toUpperCase();
    return `SRV-${timestamp}-${random}`;
  }

  async create(data: Partial<IServiceRequest>): Promise<IServiceRequest> {
    const requestNumber = this.generateRequestNumber();
    return ServiceRequest.create({ ...data, requestNumber });
  }

  async getAll(query: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) {
    const { page = 1, limit = 10, status, search } = query;
    const filter: Record<string, unknown> = {};

    if (status) filter.status = status;
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { customerName: { $regex: escaped, $options: 'i' } },
        { customerEmail: { $regex: escaped, $options: 'i' } },
        { requestNumber: { $regex: escaped, $options: 'i' } },
        { deviceModel: { $regex: escaped, $options: 'i' } },
      ];
    }

    const [requests, total] = await Promise.all([
      ServiceRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('user', 'name email'),
      ServiceRequest.countDocuments(filter),
    ]);

    return {
      requests,
      totalRequests: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  }

  async getById(id: string): Promise<IServiceRequest> {
    const request = await ServiceRequest.findById(id).populate('user', 'name email phone');
    if (!request) throw new NotFoundError('Service request');
    return request;
  }

  async getByUser(userId: string) {
    return ServiceRequest.find({ user: userId }).sort({ createdAt: -1 });
  }

  async updateStatus(id: string, status: string, adminNotes?: string, finalPrice?: number) {
    const update: Record<string, unknown> = { status };
    if (adminNotes !== undefined) update.adminNotes = adminNotes;
    if (finalPrice !== undefined) update.finalPrice = finalPrice;

    const request = await ServiceRequest.findByIdAndUpdate(id, update, { new: true });
    if (!request) throw new NotFoundError('Service request');
    return request;
  }

  async delete(id: string) {
    const request = await ServiceRequest.findByIdAndDelete(id);
    if (!request) throw new NotFoundError('Service request');
    return request;
  }

  async getStats() {
    const [total, pending, inProgress, completed] = await Promise.all([
      ServiceRequest.countDocuments(),
      ServiceRequest.countDocuments({ status: 'pending' }),
      ServiceRequest.countDocuments({ status: 'in_progress' }),
      ServiceRequest.countDocuments({ status: 'completed' }),
    ]);
    return { total, pending, inProgress, completed };
  }
}

export default new ServiceRequestService();
