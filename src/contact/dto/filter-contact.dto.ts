import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ContactStatus } from '../../enums/contact.enum';

export class FilterContactDto {
  @ApiProperty({ enum: ContactStatus, required: false })
  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;
}
