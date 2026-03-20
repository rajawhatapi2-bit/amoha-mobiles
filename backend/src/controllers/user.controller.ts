import { Response, NextFunction } from 'express';
import userService from '../services/user.service';
import User from '../models/user.model';
import { NotFoundError } from '../errors/app-error';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendMessage } from '../utils/response.util';
import { notifyKyc } from '../utils/notify';
import { sendKycStatusEmail } from '../utils/email.util';

class UserController {
  async getAddresses(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const addresses = await userService.getAddresses(req.user!.userId);
      sendSuccess(res, addresses, 'Addresses fetched');
    } catch (error) {
      next(error);
    }
  }

  async addAddress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const addresses = await userService.addAddress(req.user!.userId, req.body);
      sendSuccess(res, addresses, 'Address added', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateAddress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const addresses = await userService.updateAddress(req.user!.userId, req.params.addressId, req.body);
      sendSuccess(res, addresses, 'Address updated');
    } catch (error) {
      next(error);
    }
  }

  async deleteAddress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const addresses = await userService.deleteAddress(req.user!.userId, req.params.addressId);
      sendSuccess(res, addresses, 'Address deleted');
    } catch (error) {
      next(error);
    }
  }

  // Admin
  async getAllUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await userService.getAllUsers(page, limit);
      sendSuccess(res, result, 'Users fetched');
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const foundUser = await User.findById(req.params.id);
      if (!foundUser) {
        return next(new NotFoundError('User'));
      }
      sendSuccess(res, foundUser, 'User fetched');
    } catch (error) {
      next(error);
    }
  }

  async toggleBlock(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { isBlocked } = req.body;
      const user = await userService.toggleBlock(req.params.id, isBlocked);
      sendSuccess(res, user, `User ${isBlocked ? 'blocked' : 'unblocked'}`);
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await userService.deleteUser(req.params.id);
      sendMessage(res, 'User deleted');
    } catch (error) {
      next(error);
    }
  }

  // KYC
  async submitKyc(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await User.findById(req.user!.userId);
      if (!user) return next(new NotFoundError('User'));
      if (user.kyc?.status === 'verified') {
        return sendSuccess(res, user.kyc, 'KYC already verified');
      }
      if (!req.body.documentImage) {
        res.status(400).json({ success: false, message: 'Document image upload is mandatory' });
        return;
      }
      user.kyc.status = 'pending';
      user.kyc.documentType = req.body.documentType;
      user.kyc.documentNumber = req.body.documentNumber;
      user.kyc.documentImage = req.body.documentImage;
      user.kyc.fullName = req.body.fullName;
      user.kyc.submittedAt = new Date();
      user.kyc.rejectionReason = undefined;
      await user.save();
      notifyKyc(user.kyc.fullName || user.name, user._id.toString());
      sendKycStatusEmail(user.email, user.name, 'pending').catch(() => {});
      sendSuccess(res, user.kyc, 'KYC submitted for verification');
    } catch (error) {
      next(error);
    }
  }

  async getKycStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await User.findById(req.user!.userId);
      if (!user) return next(new NotFoundError('User'));
      sendSuccess(res, user.kyc || { status: 'not_submitted' }, 'KYC status fetched');
    } catch (error) {
      next(error);
    }
  }

  // Admin KYC management
  async verifyKyc(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return next(new NotFoundError('User'));
      user.kyc.status = 'verified';
      user.kyc.verifiedAt = new Date();
      await user.save();
      sendKycStatusEmail(user.email, user.name, 'verified').catch(() => {});
      sendSuccess(res, user, 'KYC verified');
    } catch (error) {
      next(error);
    }
  }

  async rejectKyc(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return next(new NotFoundError('User'));
      user.kyc.status = 'rejected';
      user.kyc.rejectionReason = req.body.rejectionReason || req.body.reason || '';
      await user.save();
      sendKycStatusEmail(user.email, user.name, 'rejected', user.kyc.rejectionReason).catch(() => {});
      sendSuccess(res, user, 'KYC rejected');
    } catch (error) {
      next(error);
    }
  }
}

export default new UserController();
