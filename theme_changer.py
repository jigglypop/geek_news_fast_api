import os
from config import THEME_PRESETS

def change_theme(theme_name):
    if theme_name not in THEME_PRESETS:
        available_themes = list(THEME_PRESETS.keys())
        print(f"[ERROR] 존재하지 않는 테마: {theme_name}")
        print(f"사용 가능한 테마: {', '.join(available_themes)}")
        return False
    
    env_path = ".env"
    
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        updated = False
        for i, line in enumerate(lines):
            if line.startswith('DESIGN_THEME='):
                lines[i] = f'DESIGN_THEME="{theme_name}"\n'
                updated = True
                break
        
        if not updated:
            lines.append(f'DESIGN_THEME="{theme_name}"\n')
        
        with open(env_path, 'w', encoding='utf-8') as f:
            f.writelines(lines)
    else:
        with open(env_path, 'w', encoding='utf-8') as f:
            f.write(f'DESIGN_THEME="{theme_name}"\n')
    
    theme = THEME_PRESETS[theme_name]
    print(f"[SUCCESS] 테마 변경 완료: {theme_name}")
    print(f"색상: {theme['colors']['cover_background']}")
    print(f"제목: {theme['texts']['cover_title']}")
    print(f"부제목: {theme['texts']['cover_subtitle']}")
    print("\n서버를 재시작하면 새 테마가 적용됩니다.")
    return True

def preview_themes():
    print("사용 가능한 테마:")
    print("=" * 50)
    
    for theme_name, theme_data in THEME_PRESETS.items():
        print(f"\n테마: {theme_name}")
        print(f"  제목: {theme_data['texts']['cover_title']}")
        print(f"  부제목: {theme_data['texts']['cover_subtitle']}")
        print(f"  색상: {theme_data['colors']['cover_background']}")
        print(f"  제목 크기: {theme_data['fonts']['cover_title']}")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("사용법:")
        print("  python theme_changer.py preview    # 테마 목록 보기")
        print("  python theme_changer.py <테마명>   # 테마 변경")
        print("\n예시:")
        print("  python theme_changer.py default")
        print("  python theme_changer.py purple")
        print("  python theme_changer.py green")
    elif sys.argv[1] == "preview":
        preview_themes()
    else:
        theme_name = sys.argv[1]
        change_theme(theme_name) 