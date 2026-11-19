// 공실 후보 공간에 보여 주는 예시 사진의 출처. 사진은 Wikimedia Commons에서 받은 것이고, 각 라이선스에 따라 작성자를 밝힌다.
// 파일은 frontend/public/images/spaces/ 에 있다. 백엔드(candidate_space.py)가 공간 위치로 이 파일 중 하나를 고른다.

export type SpaceImageCredit = {
  file: string;
  title: string;
  artist: string;
  license: string;
  source: string; // 원본 사진 페이지
};

export const SPACE_IMAGE_CREDITS: SpaceImageCredit[] = [
  { file: "space-01.jpg", title: "Door in a white room (Unsplash).jpg", artist: "Philipp Berndt philberndt", license: "CC0", source: "https://commons.wikimedia.org/wiki/File:Door_in_a_white_room_(Unsplash).jpg" },
  { file: "space-02.jpg", title: "Untenanted commercial space.jpg", artist: "Downtowngal", license: "CC BY-SA 3.0", source: "https://commons.wikimedia.org/wiki/File:Untenanted_commercial_space.jpg" },
  { file: "space-03.jpg", title: "Breather Montreal interior (Unsplash).jpg", artist: "Breather breather", license: "CC0", source: "https://commons.wikimedia.org/wiki/File:Breather_Montreal_interior_(Unsplash).jpg" },
  { file: "space-04.jpg", title: "Minimalist office (Unsplash).jpg", artist: "Daniel von Appen daniel_von_appen", license: "CC0", source: "https://commons.wikimedia.org/wiki/File:Minimalist_office_(Unsplash).jpg" },
  { file: "space-05.jpg", title: "Empty Wilko's shop, Fore Street Redruth, Cornwall - September 2023.jpg", artist: "Mutney", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Empty_Wilko%27s_shop,_Fore_Street_Redruth,_Cornwall_-_September_2023.jpg" },
  { file: "space-06.jpg", title: "Empty interior of Parkdale Dollarama, September 2026.jpg", artist: "Qviri", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Empty_interior_of_Parkdale_Dollarama,_September_2026.jpg" },
  { file: "space-07.jpg", title: "Inside Of Former Pier 1; Boardman OH.jpg", artist: "Larry Hachucka", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Inside_Of_Former_Pier_1;_Boardman_OH.jpg" },
  { file: "space-08.jpg", title: "Interior of former Guild Theatre at early stage of its conversion into retail space, March 2018.jpg", artist: "Steve Morgan", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Interior_of_former_Guild_Theatre_at_early_stage_of_its_conversion_into_retail_space,_March_2018.jpg" },
  { file: "space-09.jpg", title: "Former Wendy's Interior, Palm Bay, Florida.jpg", artist: "Pokemonprime", license: "CC BY 4.0", source: "https://commons.wikimedia.org/wiki/File:Former_Wendy%27s_Interior,_Palm_Bay,_Florida.jpg" },
  { file: "space-10.jpg", title: "Empty Chipotle (51265257796).jpg", artist: "Eden, Janine and Jim from New York City", license: "CC BY 2.0", source: "https://commons.wikimedia.org/wiki/File:Empty_Chipotle_(51265257796).jpg" },
  { file: "space-11.jpg", title: "120 E 8th Street, Los Angeles, California (Unsplash).jpg", artist: "Breather breather", license: "CC0", source: "https://commons.wikimedia.org/wiki/File:120_E_8th_Street,_Los_Angeles,_California_(Unsplash).jpg" },
  { file: "space-12.jpg", title: "VINTAGE Former Things Remembered; Rivergate Mall; Goodletsville TN.jpg", artist: "Larry Hachucka", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:VINTAGE_Former_Things_Remembered;_Rivergate_Mall;_Goodletsville_TN.jpg" },
];
