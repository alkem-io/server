export type GeoapifyGeocodeResponse = {
  type: string;
  features: [
    {
      type: string;
      properties: {
        country: string;
        lon: number;
        lat: number;
      };
    },
  ];
};
