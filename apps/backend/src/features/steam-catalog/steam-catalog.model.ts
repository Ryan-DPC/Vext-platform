import mongoose, { Schema } from 'mongoose';

/**
 * Cache local du catalogue Steam (comme SteamDB) : liste des jeux + prix.
 * Les données viennent de l'API Steam ; on ne revend rien, l'achat se fait sur Steam.
 */
const priceSchema = new Schema({
    currency: String,
    initial: Number,          // centimes
    final: Number,            // centimes
    discount_percent: Number,
    initial_formatted: String,
    final_formatted: String
}, { _id: false });

const steamAppSchema = new Schema({
    appid: { type: Number, required: true, unique: true, index: true },
    name: { type: String, required: true },
    name_lower: { type: String, index: true },
    is_free: { type: Boolean, default: false },
    price: { type: priceSchema, default: null },
    short_description: String,
    header_image: String,     // URL exacte fournie par Steam (les jeux récents ont un chemin avec hash)
    capsule_image: String,
    type: String,             // game | demo | dlc | ...
    developers: [String],
    publishers: [String],
    platforms: { windows: Boolean, mac: Boolean, linux: Boolean },
    metacritic: Number,
    recommendations: Number,
    unavailable_at: Date,     // appdetails a répondu « indisponible » (retiré / restreint) : réessai espacé
    genres: [String],
    release_date: String,
    // listes de mise en avant : 'top_sellers' | 'specials' | 'new_releases' | 'coming_soon'
    featured: { type: [String], default: [], index: true },
    featured_rank: { type: Number, default: 9999 },
    price_fetched_at: Date,
    details_fetched_at: Date
}, { timestamps: true });

steamAppSchema.index({ details_fetched_at: 1, appid: -1 });

export const SteamApp = mongoose.models.SteamApp || mongoose.model('SteamApp', steamAppSchema);
