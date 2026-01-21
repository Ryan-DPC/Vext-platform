import mongoose from 'mongoose';
import { itemsService } from '../src/features/items/items.service';
import { ItemModel } from '../src/features/items/items.model';

const connectDB = async () => {
    if (!process.env.MONGODB_URI) throw new Error("No MONGODB_URI");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");
};

const run = async () => {
    await connectDB();

    console.log("Fetching items from Cloudinary...");
    const cloudinaryItems = await itemsService.getItemsFromCloudinary();
    console.log(`Found ${cloudinaryItems.length} items from Cloudinary.`);

    let created = 0;
    let updated = 0;

    for (const cItem of cloudinaryItems) {
        if (cItem.item_type === 'other') {
            console.log(`Skipping 'other' item: ${cItem.name}`);
            continue;
        }

        // Search by cloudinary_id to avoid dupes
        const existing = await ItemModel.findOne({ cloudinary_id: cItem.cloudinary_id });
        if (existing) {
            if (existing.item_type !== cItem.item_type) {
                console.log(`Updating type for ${cItem.name}: ${existing.item_type} -> ${cItem.item_type}`);
                existing.item_type = cItem.item_type;
                existing.image_url = cItem.image_url;
                await existing.save();
                updated++;
            }
        } else {
            console.log(`Creating new item: ${cItem.name} [${cItem.item_type}]`);
            await ItemModel.create({
                ...cItem,
                is_archived: false
            });
            created++;
        }
    }

    console.log(`Sync complete. Created: ${created}, Updated: ${updated}`);
    process.exit(0);
};

run();
