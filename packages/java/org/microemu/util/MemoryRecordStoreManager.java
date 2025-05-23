����   0 �
   R S
  R	  T	  U V
  W X Y
 	 Z
  [ \
  R
  ]
  ^
  _
  `
  a
  b
  c d e
  f g d h
  i
  j
 k l
 k m
 n o p q r s t recordStores Ljava/util/Hashtable; recordListener *Lorg/microemu/util/ExtendedRecordListener; <init> ()V Code LineNumberTable LocalVariableTable this ,Lorg/microemu/util/MemoryRecordStoreManager; init (Lorg/microemu/MicroEmulator;)V emulator Lorg/microemu/MicroEmulator; getName ()Ljava/lang/String; deleteRecordStore (Ljava/lang/String;)V recordStoreName Ljava/lang/String; recordStoreImpl #Lorg/microemu/util/RecordStoreImpl; 
Exceptions openRecordStore 9(Ljava/lang/String;Z)Ljavax/microedition/rms/RecordStore; createIfNecessary Z listRecordStores ()[Ljava/lang/String; e Ljava/util/Enumeration; result [Ljava/lang/String; i I saveChanges &(Lorg/microemu/util/RecordStoreImpl;)V deleteStores getSizeAvailable &(Lorg/microemu/util/RecordStoreImpl;)I setRecordListener -(Lorg/microemu/util/ExtendedRecordListener;)V fireRecordStoreListener (ILjava/lang/String;)V type 
SourceFile MemoryRecordStoreManager.java & ' java/util/Hashtable " # $ % Memory record store u v !org/microemu/util/RecordStoreImpl 3javax/microedition/rms/RecordStoreNotFoundException & 4 w x +javax/microedition/rms/RecordStoreException y v M N & z { | } ~  � � � � � x � � java/lang/String � � H ' � ' � � � � � � � � � � � *org/microemu/util/MemoryRecordStoreManager java/lang/Object org/microemu/RecordStoreManager get &(Ljava/lang/Object;)Ljava/lang/Object; isOpen ()Z remove 6(Lorg/microemu/RecordStoreManager;Ljava/lang/String;)V put 8(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object; setOpen (Z)V addRecordListener *(Ljavax/microedition/rms/RecordListener;)V keys ()Ljava/util/Enumeration; java/util/Enumeration hasMoreElements size ()I nextElement ()Ljava/lang/Object; clear java/lang/Runtime 
getRuntime ()Ljava/lang/Runtime; 
freeMemory ()J java/lang/System currentTimeMillis (org/microemu/util/ExtendedRecordListener recordStoreEvent (IJLjava/lang/String;)V !     !   " #    $ %     & '  (   G     *� *� Y� � *� �    )       %  &  ( *        + ,    - .  (   5      �    )       + *        + ,      / 0   1 2  (   -     �    )       . *        + ,    3 4  (   �     9*� +� � M,� � 	Y+� 
�,� � � Y� �*� +� W*
+� �    )   "    2  3  4  6   7 ( 9 1 ; 8 < *        9 + ,     9 5 6   - 7 8  9     	   : ;  (   �     N*� +� � N-� $� � 	Y+� 
�� Y*+� N*� +-� W-� *� � -*� � *+� -�    )   .    @  A  B  C  E ' F 1 H 6 I = J E M L O *   *    N + ,     N 5 6    N < =   B 7 8  9     	  > ?  (   �     8L=*� � N-�  � $+� *� � � L+-�  � S����+�    )   "    S  U  V  W  X $ Z 0 [ 6 ^ *   *   * @ A    8 + ,    6 B C   4 D E   F G  (   5      �    )       b *        + ,      7 8   - '  (   3     *� �    )   
    e  f *        + ,    H '  (   A     *� � 
*� � �    )       i  j  k *        + ,    I J  (   <     � � ��    )       o *        + ,      7 8   K L  (   >     *+� �    )   
    s  t *        + ,      $ %   M N  (   \     *� � *� � ,�  �    )       w  x  z *         + ,      O E     5 6   P    Q