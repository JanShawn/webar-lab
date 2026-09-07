import {createARProvider} from '../../core/createARProvider'
import {create8thWallSession} from './session.client'

export const create8thWallProvider = (options) => createARProvider(create8thWallSession(options))

