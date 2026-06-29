import { PartialType } from '@nestjs/swagger';
import { CreateRssSourceDto } from './create-rss-source.dto';

export class UpdateRssSourceDto extends PartialType(CreateRssSourceDto) {}
