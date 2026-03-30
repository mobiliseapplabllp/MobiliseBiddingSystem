import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginRequestDto {
  @ApiProperty({ example: 'admin@esourcing.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'admin123' })
  @IsString()
  @MinLength(6)
  password: string;
}

export class RefreshRequestDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class SimulateLoginDto {
  @ApiProperty({ example: 'user-uuid-here' })
  @IsString()
  userId: string;
}
