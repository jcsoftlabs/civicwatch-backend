import { PartialType } from '@nestjs/swagger';
import { CreateXConnectionDto } from './create-x-connection.dto';

export class UpdateXConnectionDto extends PartialType(CreateXConnectionDto) {}
