import { PartialType } from '@nestjs/swagger';
import { CreateCrawlSourceDto } from './create-crawl-source.dto';

export class UpdateCrawlSourceDto extends PartialType(CreateCrawlSourceDto) {}
