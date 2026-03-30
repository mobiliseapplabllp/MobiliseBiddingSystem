import { Controller, Post, Get, Patch, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginRequestDto, RefreshRequestDto, SimulateLoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() dto: LoginRequestDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Refresh JWT token' })
  async refresh(@Body() dto: RefreshRequestDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async me(@CurrentUser() user: JwtPayload) {
    return this.authService.getProfile(user.sub);
  }

  // ── User Preferences ─────────────────────────────────────────────────────────

  @Patch('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user preferences (locale, theme)' })
  async updatePreferences(
    @CurrentUser() user: JwtPayload,
    @Body() body: { locale?: string; theme?: string },
  ) {
    return this.authService.updatePreferences(user.sub, body);
  }

  // ── Org/User Switcher (authenticated — requires USER_IMPERSONATE or multi-org) ──

  @Get('simulate/orgs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List orgs for switcher (requires USER_IMPERSONATE or multi-org)' })
  async simulateOrgs(@CurrentUser() user: JwtPayload) {
    return this.authService.listOrgsForSimulate(user);
  }

  @Get('simulate/orgs/:orgId/users')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List users in org for switcher' })
  async simulateUsers(@Param('orgId') orgId: string, @CurrentUser() user: JwtPayload) {
    return this.authService.listUsersForSimulate(orgId, user);
  }

  @Post('simulate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Switch to another user (requires USER_IMPERSONATE or same-org)' })
  async simulateLogin(@Body() dto: SimulateLoginDto, @CurrentUser() user: JwtPayload) {
    return this.authService.simulateLogin(dto.userId, user);
  }
}
