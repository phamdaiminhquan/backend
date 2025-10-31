import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ example: 'Nguyễn Văn A', required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  fullName?: string;

  @ApiProperty({ example: '0938123456', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'OldP@ssw0rd', required: false })
  @ValidateIf((o) => Boolean(o.newPassword))
  @IsString()
  @MinLength(6)
  currentPassword?: string;

  @ApiProperty({ example: 'N3wP@ssw0rd', required: false })
  @IsOptional()
  @IsString()
  @MinLength(6)
  newPassword?: string;
}
