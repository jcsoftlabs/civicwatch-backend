import { PartialType } from '@nestjs/swagger';
import { CreateMentionDto } from './create-mention.dto';

export class UpdateMentionDto extends PartialType(CreateMentionDto) {}
