import userModel from "../models/userModel.js";
import {productModel} from "../models/productModel.js";
import {v2 as cloudinary} from 'cloudinary';


export const allProductsController = async (req, res) => {
    try {
        // Retrieve the user's ID from req.user
        const userId = req.user._id;

        // Find the corresponding user document using the user's ID
        const user = await userModel.findById(userId);

        // Extract the community ID from the user document
        const communityId = user.communityId;

        // Query the productModel for all products belonging to the community
        const products = await productModel.find({ communityId });

        // Send the retrieved products as a response
        res.status(200).json({ success: true, products });
    } catch (error) {
        console.error('Error retrieving products:', error);
        res.status(500).json({ success: false, message: 'Error in products fetch' });
    }
};


export const postProductsController = async (req, res) => {
    try {
        const { productName, productDetails } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided' });
        }

        // Upload image to Cloudinary
        cloudinary.uploader.upload_stream({ resource_type: 'auto' }, async (error, result) => {
            if (error) {
                console.error('Error uploading profile picture to Cloudinary:', error);
                return res.status(500).json({ message: 'Error uploading to coloudinary products' });
            }

            const userId = req.user._id; // Assuming user data is attached to the request object
            const photoUrl = result.secure_url;

            // Create new product
            const product = await productModel.create({
                productName,
                productDetails,
                memberId: userId,
                photoUrl
            });

            res.status(200).json({
                success: true,
                message: 'New product created',
                product
            });
        }).end(req.file.buffer);
    } catch (error) {
        console.log("Error in new product", error);
        res.status(500).json({
            success: false,
            message: "Adding new product failed"
        });
    }
};


//Book a product
// In your productController.js

export const bookProductController = async (req, res) => {
    try {
        const { productId } = req.body; // Assuming you send the product ID in the request body
        const userId = req.user._id; // Assuming user data is attached to the request object

        // Find the product by its ID and update the bookedBy array
        const updatedProduct = await productModel.findByIdAndUpdate(
            productId,
            { $push: { bookedBy: userId } }, // Add the user's ID to the bookedBy array
            { new: true } // Return the updated product
        );

        res.status(200).json({
            success: true,
            message: 'Product booked successfully',
            product: updatedProduct
        });
    } catch (error) {
        console.error('Error booking product:', error);
        res.status(500).json({ success: false, message: 'Error booking product' });
    }
};

//Retrieving booked users
// productController.js
export const getBookedUsersController = async (req, res) => {
    try {
        const { productId } = req.params;

        // Find the product by its ID
        const product = await productModel.findById(productId).populate('bookedBy');

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Extract the booked users from the product document
        const bookedUsers = product.bookedBy.map(user => ({
            name: user.name,
            phone: user.phone
        }));
        

        res.status(200).json({ success: true, bookedUsers });
    } catch (error) {
        console.error('Error retrieving booked users:', error);
        res.status(500).json({ success: false, message: 'Error retrieving booked users' });
    }
};
