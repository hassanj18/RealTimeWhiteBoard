import { Schema, model, type InferSchemaType, type Model } from "mongoose";

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

UserSchema.index({ email: 1 }, { unique: true });

export type UserDoc = InferSchemaType<typeof UserSchema>;

export const UserModel: Model<UserDoc> = model<UserDoc>("User", UserSchema);
