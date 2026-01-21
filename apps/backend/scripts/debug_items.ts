import mongoose from 'mongoose';
import { ItemModel } from '../src/features/items/items.model';

const connectDB = async () => {
    if (!process.env.MONGODB_URI) throw new Error("No MONGODB_URI");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");
};

const run = async () => {
    await connectDB();

    // List ALL items to see what's there
    const items = await ItemModel.find({ name: { $regex: /test/i } });
    console.log("Items matching 'test':");
    items.forEach(i => console.log(`- ${i.name} [${i.item_type}] (${i._id})`));

    process.exit(0);
};

run();
