import express from 'express'
import { isAuth } from '../middlewares/authMiddleware.js';
import { allProductsController, postProductsController } from '../controllers/productController.js';
import {upload} from '../middlewares/multer.js';


//router object
const router = express.Router();

//Routes
//Get all products
router.get('/products',isAuth, allProductsController );

//post product                                      //use this for sending picture
router.post('/post/products', isAuth, upload.single('productPicture'), postProductsController);

//export
export default router;