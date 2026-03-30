import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto, RespondInvitationDto } from './dto/invitation.dto';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Invitations')
@Controller()
export class InvitationsController {
  constructor(private readonly service: InvitationsService) {}

  // ── Buyer routes (authenticated) ──────────────────────────────────────────

  @Post('rfx-events/:eventId/invitations')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUYER', 'ORG_ADMIN', 'BU_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Invite a supplier to an RFx event' })
  async invite(
    @Param('eventId') eventId: string,
    @Body() dto: CreateInvitationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.invite(user.orgId!, eventId, dto, user);
  }

  @Get('rfx-events/:eventId/invitations')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUYER', 'ORG_ADMIN', 'BU_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'List invitations for an RFx event' })
  async list(@Param('eventId') eventId: string, @CurrentUser() user: JwtPayload) {
    return this.service.listInvitations(user.orgId!, eventId);
  }

  @Delete('rfx-events/:eventId/invitations/:invitationId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUYER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Revoke a supplier invitation' })
  async revoke(
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.service.revoke(user.orgId!, invitationId, user);
    return { message: 'Invitation revoked' };
  }

  // ── Supplier portal (token-based, no auth required) ───────────────────────

  @Get('supplier/invitations/:token')
  @ApiOperation({ summary: 'Get invitation details by token (supplier portal)' })
  async getByToken(@Param('token') token: string) {
    return this.service.getByToken(token);
  }

  @Post('supplier/invitations/:token/respond')
  @ApiOperation({ summary: 'Accept or decline an invitation' })
  async respond(@Param('token') token: string, @Body() dto: RespondInvitationDto) {
    return this.service.respond(token, dto);
  }
}
