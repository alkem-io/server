import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { CalendarEventType } from '@common/enums/calendar.event.type';
import { ProfileType } from '@common/enums/profile.type';
import { RoomType } from '@common/enums/room.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileService } from '@domain/common/profile/profile.service';
import { RoomService } from '@domain/communication/room/room.service';
import { Space } from '@domain/space/space/space.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { CreateCalendarEventInput } from './dto/event.dto.create';
import { UpdateCalendarEventInput } from './dto/event.dto.update';
import { CalendarEvent } from './event.entity';
import { ICalendarEvent } from './event.interface';
import { CalendarEventService } from './event.service';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';

describe('CalendarEventService', () => {
  let service: CalendarEventService;
  let db: any;
  let authorizationPolicyService: AuthorizationPolicyService;
  let profileService: ProfileService;
  let roomService: RoomService;

  beforeEach(async () => {
    // Mock static CalendarEvent.create to avoid DataSource requirement
    vi.spyOn(CalendarEvent, 'create').mockImplementation((input: any) => {
      const entity = new CalendarEvent();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarEventService,
        MockCacheManager,
        MockWinstonProvider,
        mockDrizzleProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<CalendarEventService>(CalendarEventService);
    authorizationPolicyService = module.get<AuthorizationPolicyService>(
      AuthorizationPolicyService
    );
    profileService = module.get<ProfileService>(ProfileService);
    roomService = module.get<RoomService>(RoomService);
    db = module.get(DRIZZLE);
  });

  describe('createCalendarEvent', () => {
    const buildCreateInput = (
      overrides?: Partial<CreateCalendarEventInput>
    ): CreateCalendarEventInput => ({
      type: CalendarEventType.EVENT,
      nameID: 'test-event',
      profileData: { displayName: 'Test Event' } as any,
      tags: ['tag1', 'tag2'],
      startDate: new Date('2025-06-15'),
      wholeDay: false,
      multipleDays: false,
      durationMinutes: 60,
      durationDays: 0,
      visibleOnParentCalendar: true,
      ...overrides,
    });

    it('should create a calendar event with profile, authorization, and comments room when given valid input', async () => {
      // Arrange
      const input = buildCreateInput();
      const mockStorageAggregator = { id: 'storage-1' } as any;
      const userId = 'user-1';
      const mockProfile = {
        id: 'profile-1',
        displayName: 'Test Event',
      } as any;
      const mockRoom = { id: 'room-1' } as any;

      profileService.createProfile = vi.fn().mockResolvedValue(mockProfile);
      profileService.addOrUpdateTagsetOnProfile = vi
        .fn()
        .mockResolvedValue(undefined);
      roomService.createRoom = vi.fn().mockResolvedValue(mockRoom);

      const mockAuth = new AuthorizationPolicy(AuthorizationPolicyType.CALENDAR_EVENT);
      db.returning.mockResolvedValueOnce([{
        ...input,
        id: 'event-1',
        profile: mockProfile,
        authorization: mockAuth,
        createdBy: userId,
        comments: mockRoom,
      }]);

      // Act
      const result = await service.createCalendarEvent(
        input,
        mockStorageAggregator,
        userId
      );

      // Assert
      expect(result.profile).toBe(mockProfile);
      expect(result.authorization).toBeInstanceOf(AuthorizationPolicy);
      expect(result.authorization?.type).toBe(
        AuthorizationPolicyType.CALENDAR_EVENT
      );
      expect(result.createdBy).toBe(userId);
      expect(result.comments).toBe(mockRoom);
    });

    it('should create profile with CALENDAR_EVENT type and storage aggregator when called', async () => {
      // Arrange
      const input = buildCreateInput();
      const mockStorageAggregator = { id: 'storage-1' } as any;
      const mockProfile = { id: 'profile-1' } as any;

      profileService.createProfile = vi.fn().mockResolvedValue(mockProfile);
      profileService.addOrUpdateTagsetOnProfile = vi
        .fn()
        .mockResolvedValue(undefined);
      roomService.createRoom = vi.fn().mockResolvedValue({ id: 'room-1' });
      db.returning.mockResolvedValueOnce([{ id: 'event-1' }]);

      // Act
      await service.createCalendarEvent(input, mockStorageAggregator, 'user-1');

      // Assert
      expect(profileService.createProfile).toHaveBeenCalledWith(
        input.profileData,
        ProfileType.CALENDAR_EVENT,
        mockStorageAggregator
      );
    });

    it('should add default tagset with provided tags when tags are specified', async () => {
      // Arrange
      const input = buildCreateInput({ tags: ['alpha', 'beta'] });
      const mockStorageAggregator = { id: 'storage-1' } as any;
      const mockProfile = { id: 'profile-1' } as any;

      profileService.createProfile = vi.fn().mockResolvedValue(mockProfile);
      profileService.addOrUpdateTagsetOnProfile = vi
        .fn()
        .mockResolvedValue(undefined);
      roomService.createRoom = vi.fn().mockResolvedValue({ id: 'room-1' });
      db.returning.mockResolvedValueOnce([{ id: 'event-1' }]);

      // Act
      await service.createCalendarEvent(input, mockStorageAggregator, 'user-1');

      // Assert
      expect(profileService.addOrUpdateTagsetOnProfile).toHaveBeenCalledWith(
        mockProfile,
        {
          name: TagsetReservedName.DEFAULT,
          tags: ['alpha', 'beta'],
        }
      );
    });

    it('should add default tagset with empty array when tags are not provided', async () => {
      // Arrange
      const input = buildCreateInput({ tags: undefined });
      const mockStorageAggregator = { id: 'storage-1' } as any;
      const mockProfile = { id: 'profile-1' } as any;

      profileService.createProfile = vi.fn().mockResolvedValue(mockProfile);
      profileService.addOrUpdateTagsetOnProfile = vi
        .fn()
        .mockResolvedValue(undefined);
      roomService.createRoom = vi.fn().mockResolvedValue({ id: 'room-1' });
      db.returning.mockResolvedValueOnce([{ id: 'event-1' }]);

      // Act
      await service.createCalendarEvent(input, mockStorageAggregator, 'user-1');

      // Assert
      expect(profileService.addOrUpdateTagsetOnProfile).toHaveBeenCalledWith(
        mockProfile,
        {
          name: TagsetReservedName.DEFAULT,
          tags: [],
        }
      );
    });

    it('should create a comments room with CALENDAR_EVENT type and nameID-based display name', async () => {
      // Arrange
      const input = buildCreateInput({ nameID: 'my-event' });
      const mockStorageAggregator = { id: 'storage-1' } as any;
      const mockProfile = { id: 'profile-1' } as any;

      profileService.createProfile = vi.fn().mockResolvedValue(mockProfile);
      profileService.addOrUpdateTagsetOnProfile = vi
        .fn()
        .mockResolvedValue(undefined);
      roomService.createRoom = vi.fn().mockResolvedValue({ id: 'room-1' });
      db.returning.mockResolvedValueOnce([{ id: 'event-1' }]);

      // Act
      await service.createCalendarEvent(input, mockStorageAggregator, 'user-1');

      // Assert
      expect(roomService.createRoom).toHaveBeenCalledWith({
        displayName: 'calendarEvent-comments-my-event',
        type: RoomType.CALENDAR_EVENT,
      });
    });

  });

  describe('deleteCalendarEvent', () => {
    it('should delete authorization, profile, comments, and the event when all relations exist', async () => {
      // Arrange
      const eventId = 'event-1';
      const mockAuthorization = { id: 'auth-1' } as AuthorizationPolicy;
      const mockProfile = { id: 'profile-1' } as any;
      const mockComments = { id: 'room-1' } as any;
      const mockEvent = {
        id: eventId,
        authorization: mockAuthorization,
        profile: mockProfile,
        comments: mockComments,
      } as unknown as CalendarEvent;

      db.query.calendarEvents.findFirst.mockResolvedValueOnce(mockEvent);
      authorizationPolicyService.delete = vi.fn().mockResolvedValue(undefined);
      profileService.deleteProfile = vi.fn().mockResolvedValue(undefined);
      roomService.deleteRoom = vi.fn().mockResolvedValue(undefined);

      // Act
      const result = await service.deleteCalendarEvent({ ID: eventId });

      // Assert
      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        mockAuthorization
      );
      expect(profileService.deleteProfile).toHaveBeenCalledWith(mockProfile.id);
      expect(roomService.deleteRoom).toHaveBeenCalledWith({
        roomID: mockComments.id,
      });
      expect(result.id).toBe(eventId);
    });

    it('should skip authorization deletion when event has no authorization policy', async () => {
      // Arrange
      const eventId = 'event-2';
      const mockEvent = {
        id: eventId,
        authorization: undefined,
        profile: { id: 'profile-1' },
        comments: { id: 'room-1' },
      } as unknown as CalendarEvent;

      db.query.calendarEvents.findFirst.mockResolvedValueOnce(mockEvent);
      authorizationPolicyService.delete = vi.fn();
      profileService.deleteProfile = vi.fn().mockResolvedValue(undefined);
      roomService.deleteRoom = vi.fn().mockResolvedValue(undefined);

      // Act
      await service.deleteCalendarEvent({ ID: eventId });

      // Assert
      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
    });

    it('should skip profile deletion when event has no profile', async () => {
      // Arrange
      const eventId = 'event-3';
      const mockEvent = {
        id: eventId,
        authorization: { id: 'auth-1' },
        profile: undefined,
        comments: { id: 'room-1' },
      } as unknown as CalendarEvent;

      db.query.calendarEvents.findFirst.mockResolvedValueOnce(mockEvent);
      authorizationPolicyService.delete = vi.fn().mockResolvedValue(undefined);
      profileService.deleteProfile = vi.fn();
      roomService.deleteRoom = vi.fn().mockResolvedValue(undefined);

      // Act
      await service.deleteCalendarEvent({ ID: eventId });

      // Assert
      expect(profileService.deleteProfile).not.toHaveBeenCalled();
    });

    it('should skip comments room deletion when event has no comments', async () => {
      // Arrange
      const eventId = 'event-4';
      const mockEvent = {
        id: eventId,
        authorization: { id: 'auth-1' },
        profile: { id: 'profile-1' },
        comments: undefined,
      } as unknown as CalendarEvent;

      db.query.calendarEvents.findFirst.mockResolvedValueOnce(mockEvent);
      authorizationPolicyService.delete = vi.fn().mockResolvedValue(undefined);
      profileService.deleteProfile = vi.fn().mockResolvedValue(undefined);
      roomService.deleteRoom = vi.fn();

      // Act
      await service.deleteCalendarEvent({ ID: eventId });

      // Assert
      expect(roomService.deleteRoom).not.toHaveBeenCalled();
    });

    it('should throw EntityNotFoundException when calendar event does not exist', async () => {
      // Arrange

      // Act & Assert
      await expect(
        service.deleteCalendarEvent({ ID: 'non-existent-id' })
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getCalendarEventOrFail', () => {
    it('should return the calendar event when it exists', async () => {
      // Arrange
      const eventId = 'event-1';
      const mockEvent = { id: eventId } as CalendarEvent;

      db.query.calendarEvents.findFirst.mockResolvedValueOnce(mockEvent);

      // Act
      const result = await service.getCalendarEventOrFail(eventId);

      // Assert
      expect(result).toBe(mockEvent);
    });

    it('should throw EntityNotFoundException when calendar event does not exist', async () => {
      // Arrange

      // Act & Assert
      await expect(
        service.getCalendarEventOrFail('non-existent-id')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('updateCalendarEvent', () => {
    const buildUpdateInput = (
      overrides?: Partial<UpdateCalendarEventInput>
    ): UpdateCalendarEventInput => ({
      ID: 'event-1',
      startDate: new Date('2025-07-01'),
      wholeDay: false,
      multipleDays: false,
      durationMinutes: 90,
      durationDays: 0,
      ...overrides,
    });

    it('should update scalar fields and persist the event when no profile data is provided', async () => {
      // Arrange
      const updateInput = buildUpdateInput({
        durationMinutes: 120,
        wholeDay: true,
        multipleDays: true,
        type: CalendarEventType.MEETING,
        visibleOnParentCalendar: false,
      });
      const mockEvent = {
        id: 'event-1',
        nameID: 'test-event',
        durationMinutes: 60,
        durationDays: 0,
        wholeDay: false,
        multipleDays: false,
        startDate: new Date('2025-06-15'),
        type: CalendarEventType.EVENT,
        visibleOnParentCalendar: true,
        profile: { id: 'profile-1', displayName: 'Test Event' },
        comments: { id: 'room-1' },
      } as unknown as CalendarEvent;

      db.query.calendarEvents.findFirst.mockResolvedValueOnce(mockEvent);
      db.returning.mockResolvedValueOnce([{
        ...mockEvent,
        durationMinutes: 120,
        wholeDay: true,
        multipleDays: true,
        type: CalendarEventType.MEETING,
        visibleOnParentCalendar: false,
        startDate: updateInput.startDate,
      }]);

      // Act
      const result = await service.updateCalendarEvent(updateInput);

      // Assert
      expect(result.durationMinutes).toBe(120);
      expect(result.wholeDay).toBe(true);
      expect(result.multipleDays).toBe(true);
      expect(result.type).toBe(CalendarEventType.MEETING);
      expect(result.visibleOnParentCalendar).toBe(false);
      expect(result.startDate).toEqual(updateInput.startDate);
    });

    it('should update the profile when profileData is provided and profile exists', async () => {
      // Arrange
      const updatedProfile = {
        id: 'profile-1',
        displayName: 'Updated Event',
      } as any;
      const updateInput = buildUpdateInput({
        profileData: { displayName: 'Updated Event' } as any,
      });
      const mockEvent = {
        id: 'event-1',
        nameID: 'test-event',
        durationMinutes: 60,
        durationDays: 0,
        wholeDay: false,
        multipleDays: false,
        startDate: new Date('2025-06-15'),
        type: CalendarEventType.EVENT,
        visibleOnParentCalendar: true,
        profile: { id: 'profile-1', displayName: 'Test Event' },
        comments: { id: 'room-1' },
      } as unknown as CalendarEvent;

      db.query.calendarEvents.findFirst.mockResolvedValueOnce(mockEvent);
      db.returning.mockResolvedValueOnce([{ ...mockEvent, profile: updatedProfile }]);
      profileService.updateProfile = vi.fn().mockResolvedValue(updatedProfile);

      // Act
      const result = await service.updateCalendarEvent(updateInput);

      // Assert
      expect(profileService.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'profile-1' }),
        updateInput.profileData
      );
      expect(result.profile).toBe(updatedProfile);
    });

    it('should throw EntityNotFoundException when profileData is provided but profile is not initialized', async () => {
      // Arrange
      const updateInput = buildUpdateInput({
        profileData: { displayName: 'Updated Event' } as any,
      });
      const mockEvent = {
        id: 'event-1',
        nameID: 'test-event',
        profile: undefined,
        comments: { id: 'room-1' },
      } as unknown as CalendarEvent;

      db.query.calendarEvents.findFirst.mockResolvedValueOnce(mockEvent);

      // Act & Assert
      await expect(service.updateCalendarEvent(updateInput)).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should sync room display name when displayName changes and comments room exists', async () => {
      // Arrange
      const updateInput = buildUpdateInput({
        profileData: { displayName: 'New Name' } as any,
      });
      const mockEvent = {
        id: 'event-1',
        nameID: 'test-event',
        durationMinutes: 60,
        durationDays: 0,
        wholeDay: false,
        multipleDays: false,
        startDate: new Date('2025-06-15'),
        type: CalendarEventType.EVENT,
        visibleOnParentCalendar: true,
        profile: { id: 'profile-1', displayName: 'Old Name' },
        comments: { id: 'room-1' },
      } as unknown as CalendarEvent;

      db.query.calendarEvents.findFirst.mockResolvedValueOnce(mockEvent);
      db.returning.mockResolvedValueOnce([mockEvent]);
      roomService.updateRoomDisplayName = vi.fn().mockResolvedValue(undefined);
      profileService.updateProfile = vi
        .fn()
        .mockResolvedValue({ id: 'profile-1', displayName: 'New Name' });

      // Act
      await service.updateCalendarEvent(updateInput);

      // Assert
      expect(roomService.updateRoomDisplayName).toHaveBeenCalledWith(
        mockEvent.comments,
        'calendarEvent-comments-test-event'
      );
    });

    it('should not sync room display name when displayName has not changed', async () => {
      // Arrange
      const updateInput = buildUpdateInput({
        profileData: { displayName: 'Same Name' } as any,
      });
      const mockEvent = {
        id: 'event-1',
        nameID: 'test-event',
        durationMinutes: 60,
        durationDays: 0,
        wholeDay: false,
        multipleDays: false,
        startDate: new Date('2025-06-15'),
        type: CalendarEventType.EVENT,
        visibleOnParentCalendar: true,
        profile: { id: 'profile-1', displayName: 'Same Name' },
        comments: { id: 'room-1' },
      } as unknown as CalendarEvent;

      db.query.calendarEvents.findFirst.mockResolvedValueOnce(mockEvent);
      db.returning.mockResolvedValueOnce([mockEvent]);
      roomService.updateRoomDisplayName = vi.fn();
      profileService.updateProfile = vi
        .fn()
        .mockResolvedValue({ id: 'profile-1', displayName: 'Same Name' });

      // Act
      await service.updateCalendarEvent(updateInput);

      // Assert
      expect(roomService.updateRoomDisplayName).not.toHaveBeenCalled();
    });

    it('should not sync room display name when comments room does not exist', async () => {
      // Arrange
      const updateInput = buildUpdateInput({
        profileData: { displayName: 'New Name' } as any,
      });
      const mockEvent = {
        id: 'event-1',
        nameID: 'test-event',
        durationMinutes: 60,
        durationDays: 0,
        wholeDay: false,
        multipleDays: false,
        startDate: new Date('2025-06-15'),
        type: CalendarEventType.EVENT,
        visibleOnParentCalendar: true,
        profile: { id: 'profile-1', displayName: 'Old Name' },
        comments: undefined,
      } as unknown as CalendarEvent;

      db.query.calendarEvents.findFirst.mockResolvedValueOnce(mockEvent);
      db.returning.mockResolvedValueOnce([mockEvent]);
      roomService.updateRoomDisplayName = vi.fn();
      profileService.updateProfile = vi
        .fn()
        .mockResolvedValue({ id: 'profile-1', displayName: 'New Name' });

      // Act
      await service.updateCalendarEvent(updateInput);

      // Assert
      expect(roomService.updateRoomDisplayName).not.toHaveBeenCalled();
    });

    it('should preserve visibleOnParentCalendar when update data does not provide it', async () => {
      // Arrange
      const updateInput = buildUpdateInput({
        visibleOnParentCalendar: undefined,
      });
      const mockEvent = {
        id: 'event-1',
        nameID: 'test-event',
        durationMinutes: 60,
        durationDays: 0,
        wholeDay: false,
        multipleDays: false,
        startDate: new Date('2025-06-15'),
        type: CalendarEventType.EVENT,
        visibleOnParentCalendar: true,
        profile: { id: 'profile-1', displayName: 'Test' },
        comments: { id: 'room-1' },
      } as unknown as CalendarEvent;

      db.query.calendarEvents.findFirst.mockResolvedValueOnce(mockEvent);
      db.returning.mockResolvedValueOnce([{ ...mockEvent, visibleOnParentCalendar: true }]);

      // Act
      const result = await service.updateCalendarEvent(updateInput);

      // Assert
      expect(result.visibleOnParentCalendar).toBe(true);
    });

    it('should not update type when type is not provided in update data', async () => {
      // Arrange
      const updateInput = buildUpdateInput({ type: undefined });
      const mockEvent = {
        id: 'event-1',
        nameID: 'test-event',
        durationMinutes: 60,
        durationDays: 0,
        wholeDay: false,
        multipleDays: false,
        startDate: new Date('2025-06-15'),
        type: CalendarEventType.TRAINING,
        visibleOnParentCalendar: true,
        profile: { id: 'profile-1', displayName: 'Test' },
        comments: { id: 'room-1' },
      } as unknown as CalendarEvent;

      db.query.calendarEvents.findFirst.mockResolvedValueOnce(mockEvent);
      db.returning.mockResolvedValueOnce([{ ...mockEvent, type: CalendarEventType.TRAINING }]);

      // Act
      const result = await service.updateCalendarEvent(updateInput);

      // Assert
      expect(result.type).toBe(CalendarEventType.TRAINING);
    });

    it('should throw EntityNotFoundException when the event to update does not exist', async () => {
      // Arrange
      const updateInput = buildUpdateInput({ ID: 'non-existent-id' });

      // Act & Assert
      await expect(service.updateCalendarEvent(updateInput)).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getProfileOrFail', () => {
    it('should return the profile when calendar event has a loaded profile', async () => {
      // Arrange
      const mockProfile = { id: 'profile-1', displayName: 'Test' } as any;
      const mockEvent = {
        id: 'event-1',
        profile: mockProfile,
      } as unknown as CalendarEvent;

      db.query.calendarEvents.findFirst.mockResolvedValueOnce(mockEvent);

      const inputEvent = { id: 'event-1' } as ICalendarEvent;

      // Act
      const result = await service.getProfileOrFail(inputEvent);

      // Assert
      expect(result).toBe(mockProfile);
    });

    it('should throw EntityNotFoundException when calendar event has no profile', async () => {
      // Arrange
      const mockEvent = {
        id: 'event-1',
        profile: undefined,
      } as unknown as CalendarEvent;

      db.query.calendarEvents.findFirst.mockResolvedValueOnce(mockEvent);

      const inputEvent = { id: 'event-1' } as ICalendarEvent;

      // Act & Assert
      await expect(service.getProfileOrFail(inputEvent)).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getComments', () => {
    it('should return comments when calendar event has comments loaded', async () => {
      // Arrange
      const mockComments = { id: 'room-1' } as any;
      const mockEvent = {
        id: 'event-1',
        comments: mockComments,
      } as unknown as CalendarEvent;

      db.query.calendarEvents.findFirst.mockResolvedValueOnce(mockEvent);

      // Act
      const result = await service.getComments('event-1');

      // Assert
      expect(result).toBe(mockComments);
    });

    it('should throw EntityNotFoundException when calendar event has no comments', async () => {
      // Arrange
      const mockEvent = {
        id: 'event-1',
        comments: undefined,
      } as unknown as CalendarEvent;

      db.query.calendarEvents.findFirst.mockResolvedValueOnce(mockEvent);

      // Act & Assert
      await expect(service.getComments('event-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should throw EntityNotFoundException when calendar event does not exist', async () => {
      // Arrange

      // Act & Assert
      await expect(service.getComments('non-existent-id')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });
});
