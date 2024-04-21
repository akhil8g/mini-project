import {userModel} from "../models/userModel.js";
import {productModel} from "../models/productModel.js";
import {v2 as cloudinary} from 'cloudinary';
import nodemailer from 'nodemailer';
import dotenv from "dotenv";

dotenv.config();


export const allProductsController = async (req, res) => {
    try {
        // Retrieve the user's ID from req.user
        const userId = req.user._id;

        // Find the corresponding user document using the user's ID
        const user = await userModel.findById(userId);

        // Extract the community ID from the user document
        const communityId = user.communityId;

        // Query the productModel for all products belonging to the community
        // Exclude products booked by the user and where isRented is true
        const products = await productModel.find({ 
            communityId, 
            bookedBy: { $ne: userId }, 
            isRented: false, 
            memberId: { $ne: userId } 
        });

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

// //Retrieving booked users
// // productController.js
// export const getBookedUsersController = async (req, res) => {
//     try {
//         const { productId } = req.params;

//         // Find the product by its ID
//         const product = await productModel.findById(productId).populate('bookedBy');

//         if (!product) {
//             return res.status(404).json({ success: false, message: 'Product not found' });
//         }

//         // Extract the booked users from the product document
//         const bookedUsers = product.bookedBy.map(user => ({
//             name: user.name,
//             phone: user.phone
//         }));
        

//         res.status(200).json({ success: true, bookedUsers });
//     } catch (error) {
//         console.error('Error retrieving booked users:', error);
//         res.status(500).json({ success: false, message: 'Error retrieving booked users' });
//     }
// };


//Grant the booking request from a list of requests for the product
export const grantBookingController = async (req, res) => {
    try {
        const { productId, userId } = req.body;

        // Update the user's bookedProducts array
        await userModel.findByIdAndUpdate(userId, { $push: { bookedProducts: productId } });

        // Update the product's givenTo array
        await productModel.findByIdAndUpdate(productId, {
            givenTo: userId,
            isRented:true
        });

        // Empty the bookedBy array of the productModel
        await productModel.findByIdAndUpdate(productId, { $set: { bookedBy: [] } });

        res.status(200).json({ success: true, message: 'Booking granted successfully' });
    } catch (error) {
        console.error('Error granting booking:', error);
        res.status(500).json({ success: false, message: 'Error granting booking' });
    }
};

//retrieve myitems

// productController.js

export const getMyItemsController = async (req, res) => {
    try {
        const userId = req.user._id; // Assuming user data is attached to the request object

        // Find products where the memberId is the same as the current user's ID
        const myProducts = await productModel.find({ memberId: userId })
            .populate({ 
                path: 'bookedBy', 
                select: 'name phone', 
                options: { 
                    match: { isRented: false } // Only populate if not rented
                } 
            })
            .populate({ 
                path: 'givenTo', 
                select: 'name phone', 
                options: { 
                    match: { isRented: true } // Only populate if rented
                } 
            })
            .select('productName productDetails photoUrl isRented');

        res.status(200).json({ success: true, myProducts });
    } catch (error) {
        console.error('Error retrieving user products:', error);
        res.status(500).json({ success: false, message: 'Error retrieving user products' });
    }
};


//Report controller

export const reportUserController = async (req, res) => {
    try {
        // Fetch the user ID to be reported from the request body
        const { userId, reportReason } = req.body;

        // Fetch the current user's ID from the request object
        const reporterId = req.user._id;
        const reporter = await userModel.findById(reporterId);

        // Find the user to be reported
        const userToReport = await userModel.findById(userId);
        if (!userToReport) {
            return res.status(404).json({ success: false, message: 'User to report not found' });
        }

        // Fetch the community ID from the current user
        const communityId = req.user.communityId;

        // Find the community leader corresponding to the community ID
        const leader = await userModel.findOne({ communityId, isLeader: true });
        if (!leader) {
            return res.status(404).json({ success: false, message: 'Leader not found for this community' });
        }
        console.log(userToReport._id);

        // Construct the report object
        const report = {
            userId: userToReport._id,
            name: userToReport.name,
            phone: userToReport.phone,
            email: userToReport.email,
            reason: reportReason,
            reportedBy :reporter.name
        };

        // Add the report to the leader's reports array
        await userModel.findByIdAndUpdate(leader._id, { $push: { reports: report } });

        // Send email to the reported user
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.VERIFY_EMAIL,
                pass: process.env.VERIFY_PASS
            }
        });

        const mailOptions = {
            from: process.env.VERIFY_EMAIL,
            to: userToReport.email,
            subject: 'You have been reported',
            text: `Hi ${userToReport.name},\n\nYou have been reported for the following reason: "${reportReason}" by ${reporter.name}`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending report email:', error);
            } else {
                console.log('Report email sent to user');
            }
        });

        res.status(200).json({ success: true, message: 'User reported successfully' });
    } catch (error) {
        console.error('Error reporting user:', error);
        res.status(500).json({ success: false, message: 'Error reporting user' });
    }
};


