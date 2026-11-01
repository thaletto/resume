import { Layer } from 'effect'
import { HttpRouter } from 'effect/http'

import { ApiRoutes } from './app.ts'
import { ServicesLive } from './services.ts'

export const createWebHandler = () =>
  HttpRouter.toWebHandler(ApiRoutes.pipe(Layer.provide(ServicesLive)), {
    disableLogger: true,
  })
