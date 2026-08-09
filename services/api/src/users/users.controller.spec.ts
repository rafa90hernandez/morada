import { UnauthorizedException } from '@nestjs/common';

jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

jest.mock('../common/mappers/user.mapper', () => ({
  UserMapper: {
    toPrivateResponse: jest.fn((user) => ({ id: user.id })),
  },
}));

import { UsersController } from './users.controller';

describe('UsersController', () => {
  const findById = jest.fn();
  const updateProfile = jest.fn();
  const controller = new UsersController({ findById, updateProfile } as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hydrates the authenticated principal from the database before mapping it', async () => {
    const user = { id: 'user-id' };
    findById.mockResolvedValue(user);

    await expect(controller.getMe('user-id')).resolves.toEqual({
      id: 'user-id',
    });

    expect(findById).toHaveBeenCalledWith('user-id');
  });

  it('rejects a stale token whose user no longer exists', async () => {
    findById.mockResolvedValue(null);

    await expect(controller.getMe('missing-user')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('updates only the authenticated user profile and maps the hydrated result', async () => {
    const dto = {
      displayName: 'Rafa',
      nationality: 'Brazilian',
    };
    const user = { id: 'user-id' };
    updateProfile.mockResolvedValue(user);

    await expect(controller.updateMe('user-id', dto)).resolves.toEqual({
      id: 'user-id',
    });

    expect(updateProfile).toHaveBeenCalledWith('user-id', dto);
  });
});
