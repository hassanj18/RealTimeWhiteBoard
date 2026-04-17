import { Schema, model, type InferSchemaType, type Model } from "mongoose";

const CreatureSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    power: { type: String, default: null },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  {
    timestamps: true,
    collection: "creatures",
  }
);

export type CreatureDoc = InferSchemaType<typeof CreatureSchema>;

export const CreatureModel: Model<CreatureDoc> = model<CreatureDoc>(
  "Creature",
  CreatureSchema
);