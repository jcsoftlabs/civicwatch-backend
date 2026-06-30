import { PartialType } from '@nestjs/swagger';
import { CreateWebNewsQueryDto } from './create-web-news-query.dto';

export class UpdateWebNewsQueryDto extends PartialType(CreateWebNewsQueryDto) {}
