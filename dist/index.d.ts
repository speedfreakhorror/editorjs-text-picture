import type { BlockTool, BlockToolConstructorOptions } from '@editorjs/editorjs';
import { type ImageConfig, type ToolImage } from './image';
export type { ImageConfig, ToolImage } from './image';
export interface TextPictureData {
    text: string;
    image: ToolImage | null;
    side: 'left' | 'right';
}
/** Fills defaults (side right) and drops unknown top-level keys. */
export declare function normalize(data: unknown): TextPictureData;
/** True when there is text and a picture with a description. */
export declare const isValid: (d: TextPictureData) => boolean;
/** True when there is neither text nor a picture (the only block `validate` refuses). */
export declare const isEmpty: (d: TextPictureData) => boolean;
export default class TextPictureTool implements BlockTool {
    private opts;
    private data;
    private root;
    constructor(opts: BlockToolConstructorOptions<TextPictureData, ImageConfig>);
    static get toolbox(): {
        title: string;
        icon: string;
    };
    static get isReadOnlySupported(): boolean;
    static get sanitize(): {
        text: {
            b: boolean;
            i: boolean;
            u: boolean;
            s: boolean;
            sup: boolean;
            sub: boolean;
            mark: boolean;
            code: boolean;
            a: {
                href: boolean;
            };
        };
        side: boolean;
        image: boolean;
    };
    render(): HTMLElement;
    save(): TextPictureData;
    validate(data: TextPictureData): boolean;
    renderSettings(): {
        icon: string;
        title: string;
        isActive: boolean;
        closeOnActivate: boolean;
        onActivate: () => void;
    }[];
    private draw;
}
