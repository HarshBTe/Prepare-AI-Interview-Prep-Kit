import mongoose, {
  Document,
  Model,
  Schema,
} from "mongoose";

import type { InterviewKit } from "../../../src/types/kit";
import type { BuilderMeta } from "../../../src/types/builder";

export type KitStatus =
  | "generating"
  | "ready"
  | "failed";


export interface IKit extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  status: KitStatus;
  kit: InterviewKit | null;
  builderMeta: BuilderMeta;
  errorCode?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const kitSchema = new Schema<IKit>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "generating",
        "ready",
        "failed",
      ],
      default: "generating",
    },

    kit: {
      type: Schema.Types.Mixed,
      default: null,
    },

    builderMeta: {
  type: Schema.Types.Mixed,
  default: () => ({
    questions: {},
    flashcards: {},
    companyBrief: {
      origin: "generated",
      isPinned: false,
    },
  }),
},

    errorCode: {
      type: String,
      default: undefined,
    },

    errorMessage: {
      type: String,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * A user can have many completed/failed kits,
 * but only ONE kit can be in "generating" state
 * at a time.
 *
 * The partial unique index also protects against
 * two generation requests racing each other.
 */
kitSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: "generating",
    },
  }
);

export const Kit: Model<IKit> =
  mongoose.models.Kit ||
  mongoose.model<IKit>("Kit", kitSchema);