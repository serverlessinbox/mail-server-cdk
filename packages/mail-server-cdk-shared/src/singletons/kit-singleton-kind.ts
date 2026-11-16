/**
 * The once-per-stack kit classes that mark their instances with `KitSingleton`. Every pipeline's log group
 * shares one kind; the construct id tells the groups apart.
 */
export enum KitSingletonKind {
  PUBLIC_STATIC_ASSETS_BUCKET = 'public-static-assets-bucket',
  BUCKET_AUTO_EMPTY           = 'bucket-auto-empty',
  STATIC_CONTENT_DEPLOYER     = 'static-content-deployer',
  PIPELINE_LOG_GROUP          = 'pipeline-log-group',
}
