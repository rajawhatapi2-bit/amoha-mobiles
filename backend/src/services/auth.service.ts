import User, { IUser } from '../models/user.model';
import { hashPassword, comparePassword } from '../utils/password.util';
import { generateTokenPair, verifyRefreshToken, TokenPayload } from '../utils/jwt.util';
import { ConflictError, UnauthorizedError, NotFoundError, BadRequestError } from '../errors/app-error';
import { sendPasswordResetEmail } from '../utils/email.util';
import env from '../config/env';
import { v4 as uuidv4 } from 'uuid';

class AuthService {
  async register(data: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) {
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    const hashedPassword = await hashPassword(data.password);

    const user = await User.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: hashedPassword,
    });

    const payload: TokenPayload = { userId: user._id.toString(), role: user.role };
    const tokens = generateTokenPair(payload);

    user.refreshToken = tokens.refreshToken;
    await user.save();

    return {
      user: user.toJSON(),
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async login(email: string, password: string) {
    const user = await User.findOne({ email }).select('+password +refreshToken');
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.isBlocked) {
      throw new UnauthorizedError('Your account has been blocked. Please contact support.');
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const payload: TokenPayload = { userId: user._id.toString(), role: user.role };
    const tokens = generateTokenPair(payload);

    user.refreshToken = tokens.refreshToken;
    await user.save();

    return {
      user: user.toJSON(),
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refreshToken(refreshToken: string) {
    const decoded = verifyRefreshToken(refreshToken);

    const user = await User.findById(decoded.userId).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (user.isBlocked) {
      user.refreshToken = undefined;
      await user.save();
      throw new UnauthorizedError('Your account has been blocked. Please contact support.');
    }

    const payload: TokenPayload = { userId: user._id.toString(), role: user.role };
    const tokens = generateTokenPair(payload);

    user.refreshToken = tokens.refreshToken;
    await user.save();

    return {
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(userId: string) {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
  }

  async getProfile(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  }

  async updateProfile(userId: string, updates: Partial<Pick<IUser, 'name' | 'phone' | 'avatar'>>) {
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true },
    );
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new NotFoundError('User');
    }

    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    user.password = await hashPassword(newPassword);
    await user.save();
  }

  async forgotPassword(email: string) {
    const user = await User.findOne({ email }).select('+resetPasswordToken +resetPasswordExpiry');
    if (!user) {
      // Don't reveal if email exists
      return;
    }

    const resetToken = uuidv4();
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // Send password reset email
    const frontendUrl = env.CORS_ORIGIN.split(',')[0].trim();
    sendPasswordResetEmail(user.email, user.name, resetToken, frontendUrl).catch(() => {});
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: new Date() },
    }).select('+resetPasswordToken +resetPasswordExpiry +password');

    if (!user) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    user.password = await hashPassword(newPassword);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();
  }
}

export default new AuthService();
