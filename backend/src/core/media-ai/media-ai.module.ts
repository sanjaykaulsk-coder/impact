import { Global, Module } from '@nestjs/common';
import { IMAGE_CONTENT_CLASSIFIER } from './image-content-classifier.interface';
import { MockImageContentClassifier } from './mock-image-content-classifier.provider';

@Global()
@Module({
  providers: [
    {
      provide: IMAGE_CONTENT_CLASSIFIER,
      useFactory: () => {
        const provider = process.env.IMAGE_CONTENT_CLASSIFIER_PROVIDER ?? 'mock';
        if (provider !== 'mock') {
          throw new Error(
            `IMAGE_CONTENT_CLASSIFIER_PROVIDER=${provider} has no adapter implementation yet — only "mock" exists in this phase.`,
          );
        }
        return new MockImageContentClassifier();
      },
    },
  ],
  exports: [IMAGE_CONTENT_CLASSIFIER],
})
export class MediaAiModule {}
