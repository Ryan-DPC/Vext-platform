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
    poster_image: String,     // vrai poster portrait 600x900 (library_capsule_2x), y compris pour les jeux récents
    assets_fetched_at: Date,
    type: String,             // game | demo | dlc | ...
    developers: [String],
    publishers: [String],
    platforms: { windows: Boolean, mac: Boolean, linux: Boolean },
    metacritic: Number,
    recommendations: Number,
    // Classements issus de la recherche Steam (1 = premier) : meilleures ventes, nouveautés populaires, promotions
    trend_rank: Number,
    genre_ranks: { type: Object, default: undefined }, // { [tagId]: rang } : meilleures ventes par genre
    new_rank: Number,
    special_rank: Number,
    review_percent: Number,   // % d'avis positifs
    review_count: Number,
    released_at: Date,
    popularity_score: { type: Number, default: 0 }, // 1e9 - rang (top 100 joueurs en ligne) ou nombre d'avis
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
steamAppSchema.index({ assets_fetched_at: 1, appid: -1 });
steamAppSchema.index({ recommendations: -1 });
steamAppSchema.index({ trend_rank: 1 });
steamAppSchema.index({ new_rank: 1 });
steamAppSchema.index({ special_rank: 1 });
steamAppSchema.index({ review_count: -1, review_percent: -1 });
steamAppSchema.index({ popularity_score: -1 });
steamAppSchema.index({ 'price.discount_percent': -1 });

export const SteamApp = mongoose.models.SteamApp || mongoose.model('SteamApp', steamAppSchema);
