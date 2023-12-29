import { Router } from "express";

const router: Router = Router();

import userRouter from '../resources/users/routes'

router.use('/users', userRouter)

export default router;
