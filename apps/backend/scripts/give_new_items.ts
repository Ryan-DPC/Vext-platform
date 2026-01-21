import mongoose from 'mongoose';
import { itemsService } from '../src/features/items/items.service';
import { UserModel } from '@vext/database';
import { ItemModel } from '../src/features/items/items.model';

const connectDB = async () => {
    if (!process.env.MONGODB_URI) throw new Error("No MONGODB_URI");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");
};

const run = async () => {
    await connectDB();

    // 1. Find User
    const user = await UserModel.findOne({ username: { $regex: /^test/i } });
    if (!user) {
        console.error("User test not found.");
        process.exit(1);
    }
    console.log(`Target User: ${user.username} (${user._id})`);

    // 2. Find Items (Find latest)
    const banner = await ItemModel.findOne({ item_type: 'banner' }).sort({ created_at: -1 });
    const title = await ItemModel.findOne({ item_type: 'title' }).sort({ created_at: -1 });

    console.log("Found New Items:");
    console.log("Banner:", banner ? banner.name : "NONE");
    console.log("Title:", title ? title.name : "NONE");

    const giveAndEquip = async (item: any) => {
        if (!item) return;
        try {
            await itemsService.purchaseItem(user._id.toString(), item._id.toString());
            console.log(`Added ${item.name} to inventory.`);
        } catch (e: any) {
            if (e.message.includes("Solde")) {
                // Give money
                await UserModel.updateOne({ _id: user._id }, { $inc: { tokens: 1000 } });
                console.log("Gave tokens.");
                await itemsService.purchaseItem(user._id.toString(), item._id.toString());
                console.log(`Added ${item.name} to inventory.`);
            } else {
                console.log(`User already has ${item.name} or error: ${e.message}`);
            }
        }

        // Equip
        // Note: 'title' might not have equip logic in items.service.ts yet besides updating is_equipped in UserItem.
        // User model doesn't have 'title_url' yet probably. But let's run equip anyway.
        // Banners have banner_url support now.
        await itemsService.equip(user._id.toString(), item._id.toString());
        console.log(`Equipped ${item.name}.`);
    };

    await giveAndEquip(banner);
    await giveAndEquip(title);

    console.log("Done!");
    process.exit(0);
};

run();
