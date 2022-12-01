import { compressText, decompressText } from '@common/utils/compression.util';

describe('Compression', () => {
  it('Should restore the original value when compressing and then decompressing back', async () => {
    const originalValue = 'TestTextCompression';

    const compressed = await compressText(originalValue);

    expect(await decompressText(compressed)).toEqual(originalValue);
  });

  it('Should restore the original value when compressing and then decompressing back', async () => {
    const canvasValueEscaped =
      '{\n  "type": "excalidraw",\n  "version": 2,\n  "source": "https://hub.alkem.io",\n  "elements": [\n    {\n      "id": "bXNwShWhTQXUyrHzyRz8X",\n      "type": "ellipse",\n      "x": 848.3664283752441,\n      "y": 201.3920440673828,\n      "width": 289.09088134765625,\n      "height": 278.18182373046875,\n      "angle": 0,\n      "strokeColor": "#000000",\n      "backgroundColor": "transparent",\n      "fillStyle": "hachure",\n      "strokeWidth": 1,\n      "strokeStyle": "solid",\n      "roughness": 1,\n      "opacity": 100,\n      "groupIds": [],\n      "strokeSharpness": "sharp",\n      "seed": 1784787662,\n      "version": 23,\n      "versionNonce": 573886350,\n      "isDeleted": false,\n      "boundElements": null,\n      "updated": 1656182212930,\n      "link": null\n    },\n    {\n      "id": "ivwQMjgRMAKImMISfYaJt",\n      "type": "rectangle",\n      "x": 923.8210182189941,\n      "y": 262.30113220214844,\n      "width": 154.54547119140625,\n      "height": 149.99996948242188,\n      "angle": 0,\n      "strokeColor": "#000000",\n      "backgroundColor": "transparent",\n      "fillStyle": "hachure",\n      "strokeWidth": 1,\n      "strokeStyle": "solid",\n      "roughness": 1,\n      "opacity": 100,\n      "groupIds": [],\n      "strokeSharpness": "sharp",\n      "seed": 1676425298,\n      "version": 46,\n      "versionNonce": 871046990,\n      "isDeleted": false,\n      "boundElements": null,\n      "updated": 1656182216500,\n      "link": null\n    },\n    {\n      "id": "OpXnwCwhFkAFLwZkmMi3s",\n      "type": "diamond",\n      "x": 971.0937232971191,\n      "y": 281.3920440673828,\n      "width": 53.63641357421875,\n      "height": 113.6363525390625,\n      "angle": 0,\n      "strokeColor": "#000000",\n      "backgroundColor": "transparent",\n      "fillStyle": "hachure",\n      "strokeWidth": 1,\n      "strokeStyle": "solid",\n      "roughness": 1,\n      "opacity": 100,\n      "groupIds": [],\n      "strokeSharpness": "sharp",\n      "seed": 726910098,\n      "version": 98,\n      "versionNonce": 377599570,\n      "isDeleted": false,\n      "boundElements": null,\n      "updated": 1656182224691,\n      "link": null\n    }\n  ],\n  "appState": {\n    "gridSize": null,\n    "viewBackgroundColor": "#ffffff"\n  },\n  "files": {}\n}';
    const canvasValue =
      '{   "type": "excalidraw",   "version": 2,   "source": "https://hub.alkem.io",   "elements": [     {       "id": "bXNwShWhTQXUyrHzyRz8X",       "type": "ellipse",       "x": 848.3664283752441,       "y": 201.3920440673828,       "width": 289.09088134765625,       "height": 278.18182373046875,       "angle": 0,       "strokeColor": "#000000",       "backgroundColor": "transparent",       "fillStyle": "hachure",       "strokeWidth": 1,       "strokeStyle": "solid",       "roughness": 1,       "opacity": 100,       "groupIds": [],       "strokeSharpness": "sharp",       "seed": 1784787662,       "version": 23,       "versionNonce": 573886350,       "isDeleted": false,       "boundElements": null,       "updated": 1656182212930,       "link": null     },     {       "id": "ivwQMjgRMAKImMISfYaJt",       "type": "rectangle",       "x": 923.8210182189941,       "y": 262.30113220214844,       "width": 154.54547119140625,       "height": 149.99996948242188,       "angle": 0,       "strokeColor": "#000000",       "backgroundColor": "transparent",       "fillStyle": "hachure",       "strokeWidth": 1,       "strokeStyle": "solid",       "roughness": 1,       "opacity": 100,       "groupIds": [],       "strokeSharpness": "sharp",       "seed": 1676425298,       "version": 46,       "versionNonce": 871046990,       "isDeleted": false,       "boundElements": null,       "updated": 1656182216500,       "link": null     },     {       "id": "OpXnwCwhFkAFLwZkmMi3s",       "type": "diamond",       "x": 971.0937232971191,       "y": 281.3920440673828,       "width": 53.63641357421875,       "height": 113.6363525390625,       "angle": 0,       "strokeColor": "#000000",       "backgroundColor": "transparent",       "fillStyle": "hachure",       "strokeWidth": 1,       "strokeStyle": "solid",       "roughness": 1,       "opacity": 100,       "groupIds": [],       "strokeSharpness": "sharp",       "seed": 726910098,       "version": 98,       "versionNonce": 377599570,       "isDeleted": false,       "boundElements": null,       "updated": 1656182224691,       "link": null     }   ],   "appState": {     "gridSize": null,     "viewBackgroundColor": "#ffffff"   },   "files": {} }';

    const parsedJSONvalue1 = JSON.parse(canvasValueEscaped);
    const parsedStr1 = JSON.stringify(parsedJSONvalue1);
    const compressedcanvasValueEscaped = await compressText(parsedStr1);

    const parsedJSONvalue2 = JSON.parse(canvasValue);
    const parsedStr2 = JSON.stringify(parsedJSONvalue2);
    const compressedcanvasValue = await compressText(parsedStr2);

    expect(compressedcanvasValueEscaped).toEqual(compressedcanvasValue);
  });
});
