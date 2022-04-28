import { Request, Response } from 'express';
export interface GetFeedSubmissionResultProps {
    FeedSubmissionId: string;
}
export declare function getFeedSubmissionResult({ FeedSubmissionId }: GetFeedSubmissionResultProps): Promise<string>;
export declare function doGetFeedSubmissionResult(req: Request, res: Response): Promise<undefined>;
